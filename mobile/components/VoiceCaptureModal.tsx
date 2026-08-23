import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/lib/api';

type Phase = 'idle' | 'recording' | 'transcribing' | 'questions' | 'error';

// Keep the back-and-forth short — this is a tradie on a job site, not a form.
const MAX_QUESTIONS = 3;

function fmtDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export type VoiceIntake = {
  description: string;
  customerName: string;
  tradeType: string;
};

/**
 * Voice → structured job intake.
 * Records with expo-audio, transcribes via /api/audio/transcribe, extracts
 * fields via /api/agent/intake, then — if the agent flagged anything critical
 * as missing — asks those questions back before handing the result to onResult.
 * Answers can be spoken or typed, and any question can be skipped.
 */
export function VoiceCaptureModal({
  visible,
  onClose,
  onResult,
}: {
  visible: boolean;
  onClose: () => void;
  onResult: (result: VoiceIntake) => void;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Clarifying-question state
  const [intake, setIntake] = useState<VoiceIntake | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setErrorMsg('');
      setIntake(null);
      setQuestions([]);
      setQIndex(0);
      setAnswers([]);
      setDraftAnswer('');
      setAnswerBusy(false);
    }
  }, [visible]);

  const beginRecording = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('Microphone access is needed. Enable it in Settings → Vargen EZ.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  /** Stop the recorder and return the transcript of what was just said. */
  const stopAndGetTranscript = async (): Promise<string> => {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) throw new Error('No audio was captured — try again.');
    const form = new FormData();
    form.append('audio', { uri, name: 'speech.m4a', type: 'audio/m4a' } as any);
    const res = await fetch(`${API_BASE_URL}/api/audio/transcribe`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(res.status === 401
        ? 'Please sign in to use voice.'
        : 'Could not transcribe — check your connection and try again.');
    }
    const data = await res.json();
    const text = (data?.text || '').trim();
    if (!text) throw new Error("Didn't catch that — give it another go.");
    return text;
  };

  const start = async () => {
    try {
      await beginRecording();
      setPhase('recording');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not start recording.');
      setPhase('error');
    }
  };

  const stopAndProcess = async () => {
    try {
      setPhase('transcribing');
      const text = await stopAndGetTranscript();

      // Extract structured fields. If intake is unavailable, fall back to the
      // raw transcript so voice never hard-fails.
      let result: VoiceIntake = { description: text, customerName: '', tradeType: '' };
      let asks: string[] = [];
      try {
        const iRes = await fetch(`${API_BASE_URL}/api/agent/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text }),
        });
        if (iRes.ok) {
          const d = await iRes.json();
          result = {
            description: (d?.description || text).trim(),
            customerName: (d?.customerName || '').trim(),
            tradeType: (d?.tradeType || '').trim(),
          };
          asks = Array.isArray(d?.questions) ? d.questions.slice(0, MAX_QUESTIONS) : [];
        }
      } catch { /* keep the raw-transcript fallback */ }

      if (asks.length > 0) {
        setIntake(result);
        setQuestions(asks);
        setQIndex(0);
        setAnswers([]);
        setDraftAnswer('');
        setPhase('questions');
        return;
      }
      onResult(result);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Something went wrong.');
      setPhase('error');
    }
  };

  /** Record an answer to the current question, transcribed into the field. */
  const toggleAnswerRecording = async () => {
    try {
      if (recState.isRecording) {
        setAnswerBusy(true);
        const text = await stopAndGetTranscript();
        setDraftAnswer(prev => (prev ? `${prev} ${text}` : text));
        setAnswerBusy(false);
      } else {
        await beginRecording();
      }
    } catch (e: any) {
      setAnswerBusy(false);
      setErrorMsg(e?.message || 'Could not capture that answer.');
      setPhase('error');
    }
  };

  const finish = (finalAnswers: string[]) => {
    if (!intake) return;
    // Fold the Q&A into the description so the quote generator sees the detail
    const extra = questions
      .map((q, i) => ({ q, a: (finalAnswers[i] || '').trim() }))
      .filter(x => x.a)
      .map(x => `${x.q} ${x.a}`)
      .join('\n');
    onResult({
      ...intake,
      description: extra ? `${intake.description}\n\n${extra}` : intake.description,
    });
  };

  const submitAnswer = (skip = false) => {
    if (recState.isRecording) recorder.stop().catch(() => {});
    const next = [...answers];
    next[qIndex] = skip ? '' : draftAnswer.trim();
    setAnswers(next);
    setDraftAnswer('');
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      finish(next);
    }
  };

  const handleClose = () => {
    if (recState.isRecording) recorder.stop().catch(() => {});
    onClose();
  };

  const titleFor = () => {
    if (phase === 'recording') return 'Listening…';
    if (phase === 'transcribing') return 'Writing it down…';
    if (phase === 'questions') return 'Quick question';
    if (phase === 'error') return 'Hmm.';
    return 'Tell me what you’re thinking';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <TouchableOpacity style={s.closeBtn} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
              <X size={18} color={c.mutedHi} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={s.title}>{titleFor()}</Text>

            {phase === 'questions' ? (
              <>
                <Text style={s.qCounter}>{`Question ${qIndex + 1} of ${questions.length}`}</Text>
                <Text style={s.question}>{questions[qIndex]}</Text>

                <View style={s.answerRow}>
                  <TextInput
                    style={s.answerInput}
                    value={draftAnswer}
                    onChangeText={setDraftAnswer}
                    placeholder="Type or tap the mic to answer"
                    placeholderTextColor={c.muted}
                    multiline
                  />
                  <TouchableOpacity
                    style={[s.answerMic, recState.isRecording && { backgroundColor: c.red }]}
                    onPress={toggleAnswerRecording}
                    disabled={answerBusy}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={recState.isRecording ? 'Stop and use answer' : 'Answer by voice'}
                  >
                    {answerBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : recState.isRecording
                        ? <Square size={18} color="#fff" strokeWidth={2} fill="#fff" />
                        : <Mic size={20} color="#fff" strokeWidth={2} />}
                  </TouchableOpacity>
                </View>

                <View style={s.qActions}>
                  <TouchableOpacity style={s.skipBtn} onPress={() => submitAnswer(true)} activeOpacity={0.8}>
                    <Text style={s.skipText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.nextBtn, !draftAnswer.trim() && { opacity: 0.5 }]}
                    onPress={() => submitAnswer(false)}
                    disabled={!draftAnswer.trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={s.nextText}>
                      {qIndex + 1 < questions.length ? 'Next' : 'Build my quote'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={s.sub}>
                  {phase === 'recording' ? 'Describe the job out loud — tap stop when you’re done.'
                    : phase === 'transcribing' ? 'One sec while I turn that into a quote.'
                    : phase === 'error' ? errorMsg
                    : 'e.g. "Swap the hot water system at Dalton’s, supply and fit, about eighteen hundred."'}
                </Text>

                <View style={s.stage}>
                  {phase === 'transcribing' ? (
                    <ActivityIndicator size="large" color={c.orange} />
                  ) : (
                    <TouchableOpacity
                      style={[s.micButton, phase === 'recording' && { backgroundColor: c.red }]}
                      onPress={phase === 'recording' ? stopAndProcess : start}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={phase === 'recording' ? 'Stop and transcribe' : 'Start recording'}
                    >
                      {phase === 'recording'
                        ? <Square size={30} color="#fff" strokeWidth={2} fill="#fff" />
                        : <Mic size={34} color="#fff" strokeWidth={2} />}
                    </TouchableOpacity>
                  )}
                </View>

                {phase === 'recording' && (
                  <Text style={s.timer}>{fmtDuration(recState.durationMillis)}</Text>
                )}
                {phase === 'error' && (
                  <TouchableOpacity style={s.retryBtn} onPress={() => setPhase('idle')} activeOpacity={0.85}>
                    <Text style={s.retryText}>Try again</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineMid, marginBottom: 8 },
  closeBtn: {
    position: 'absolute', top: 14, right: 16, width: 36, height: 36, borderRadius: 12,
    backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
    marginTop: 18, textAlign: 'center', letterSpacing: -0.4,
  },
  sub: {
    fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted,
    textAlign: 'center', marginTop: 8, lineHeight: 19, maxWidth: 300,
  },
  stage: { height: 130, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  micButton: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  timer: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.red, marginTop: 4 },
  retryBtn: {
    marginTop: 10, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 14, backgroundColor: c.orange,
  },
  retryText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },

  // Clarifying questions
  qCounter: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 10,
  },
  question: {
    fontSize: 17, fontFamily: 'Manrope_700Bold', color: c.ink,
    textAlign: 'center', marginTop: 8, lineHeight: 23, maxWidth: 320,
  },
  answerRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    alignSelf: 'stretch', marginTop: 18,
  },
  answerInput: {
    flex: 1, minHeight: 52, maxHeight: 120, backgroundColor: c.card,
    borderRadius: 14, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14,
    fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  answerMic: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  qActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 14 },
  skipBtn: {
    paddingHorizontal: 22, height: 50, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineMid, alignItems: 'center', justifyContent: 'center',
  },
  skipText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  nextBtn: {
    flex: 1, height: 50, borderRadius: 14, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  nextText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
