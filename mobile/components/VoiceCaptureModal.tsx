import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/lib/api';

type Phase = 'idle' | 'recording' | 'transcribing' | 'error';

function fmtDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Voice → text capture. Records with expo-audio, uploads to the server's
 * /api/audio/transcribe endpoint, and hands the transcript back via onResult.
 * The caller decides what to do with the text (here: prefill the AI quote field).
 */
export function VoiceCaptureModal({
  visible,
  onClose,
  onResult,
}: {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) { setPhase('idle'); setErrorMsg(''); }
  }, [visible]);

  const start = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setErrorMsg('Microphone access is needed. Enable it in Settings → Vargen EZ.');
        setPhase('error');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not start recording.');
      setPhase('error');
    }
  };

  const stopAndTranscribe = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio was captured — try again.');
      setPhase('transcribing');
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
      onResult(text);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Something went wrong.');
      setPhase('error');
    }
  };

  const handleClose = () => {
    // Best-effort stop if the user bails mid-recording
    if (recState.isRecording) recorder.stop().catch(() => {});
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <TouchableOpacity style={s.closeBtn} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={c.mutedHi} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={s.title}>
            {phase === 'recording' ? 'Listening…'
              : phase === 'transcribing' ? 'Writing it down…'
              : phase === 'error' ? 'Hmm.'
              : 'Tell me what you’re thinking'}
          </Text>
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
                onPress={phase === 'recording' ? stopAndTranscribe : start}
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
        </View>
      </View>
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
});
