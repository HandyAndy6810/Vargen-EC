import { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync,
} from 'expo-audio';
import { ChevronLeft, Mic, Square, User, X, Camera } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuoteDraft } from '@/hooks/use-quote-draft';
import { useSettings } from '@/hooks/use-settings';
import { showConfirm, showAlert } from '@/lib/dialogs';
import { API_BASE_URL } from '@/lib/api';

/**
 * Screen 1 of the quote flow. The job description is the entry point — no header
 * bar, no step counter, no form. Customer is deliberately optional here and only
 * becomes required at Send.
 */

type Examples = { placeholder: string; samples: string[] };

// The placeholder teaches by example rather than instruction, so it's written per
// trade. Falls back to a general set for trades without their own.
const BY_TRADE: Record<string, Examples> = {
  plumbing: {
    placeholder: 'Replace hot water system, 250L electric, existing unit in garage',
    samples: [
      'Replace hot water system, 250L electric, existing unit in garage',
      'Burst pipe under the kitchen sink, water damage to the cupboard',
      'Install new mixer tap and re-seal the vanity in the main bathroom',
    ],
  },
  electrical: {
    placeholder: 'Replace switchboard, single storey home, add safety switches',
    samples: [
      'Replace switchboard, single storey home, add safety switches',
      'Install 6 downlights in the living room, existing ceiling access',
      'Run a new 20A circuit to the shed, about 15m from the board',
    ],
  },
  carpentry: {
    placeholder: 'Build a 4x3m deck, treated pine, low set, existing concrete',
    samples: [
      'Build a 4x3m deck, treated pine, low set, existing concrete',
      'Hang 5 internal doors including hardware',
      'Replace rotted weatherboards on the south wall, about 8m',
    ],
  },
  painting: {
    placeholder: 'Repaint 3 bedroom interior, walls and ceilings, minor patching',
    samples: [
      'Repaint 3 bedroom interior, walls and ceilings, minor patching',
      'Exterior repaint, single storey weatherboard, prep and two coats',
      'Paint a new plasterboard garage, sealer plus two coats',
    ],
  },
  general: {
    placeholder: 'Describe the job — what needs doing, where, and anything that affects the price',
    samples: [
      'Replace a damaged fence panel, 3 panels, colorbond, easy access',
      'Fix a leaking gutter and reseal the downpipe joint',
      'Patch and repaint a water damaged ceiling in the hallway',
    ],
  },
};

function examplesFor(trade?: string): Examples {
  const t = String(trade || '').toLowerCase();
  for (const key of Object.keys(BY_TRADE)) {
    if (key !== 'general' && t.includes(key.slice(0, 5))) return BY_TRADE[key];
  }
  return BY_TRADE.general;
}

export default function DescribeStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = useQuoteDraft();
  const { data: settings } = useSettings() as any;

  const [text, setText] = useState(d.summary || '');
  const [showCustomers, setShowCustomers] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const touched = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  useAudioRecorderState(recorder);

  const ex = examplesFor(settings?.tradeType);
  const canGenerate = !!text.trim() && !d.aiBusy && !listening && !transcribing;

  // ── Mic: record here, append the transcript into the same field ────────────
  const startListening = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showAlert('Microphone needed', 'Enable microphone access in Settings → Vargen EZ.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setListening(true);
    } catch (e: any) {
      showAlert('Could not start recording', e?.message || 'Try again.');
    }
  };

  const stopListening = async () => {
    setListening(false);
    setTranscribing(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio was captured — try again.');
      const form = new FormData();
      form.append('audio', { uri, name: 'speech.m4a', type: 'audio/m4a' } as any);
      const res = await fetch(`${API_BASE_URL}/api/audio/transcribe`, {
        method: 'POST', body: form, credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(res.status === 401
          ? 'Please sign in to use voice.'
          : 'Could not transcribe — check your connection and try again.');
      }
      const data = await res.json();
      const said = String(data?.text || '').trim();
      if (!said) throw new Error("Didn't catch that — give it another go.");
      touched.current = true;
      setText(prev => (prev.trim() ? `${prev.trim()} ${said}` : said));
    } catch (e: any) {
      showAlert('Voice', e?.message || 'Something went wrong.');
    } finally {
      setTranscribing(false);
    }
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const onGenerate = () => {
    if (!text.trim()) return;
    showConfirm({
      title: 'Your quote, your call',
      message: 'By continuing, you take full ownership of this AI-generated quote. You are responsible for checking the pricing, scope and compliance before you send it to a customer.',
      confirmLabel: 'I understand',
      onConfirm: async () => {
        const ok = await d.generateFromDescription(text.trim());
        // Clarify lands here in the next pass; for now a successful build goes
        // straight to Review.
        if (ok) router.replace('/quotes/create/review');
      },
    });
  };

  const onBack = () => {
    if (!text.trim()) return router.back();
    showConfirm({
      title: 'Discard this description?',
      message: 'What you typed will be lost.',
      confirmLabel: 'Discard',
      destructive: true,
      onConfirm: () => router.back(),
    });
  };

  const pickCustomer = (cust: any) => {
    d.setCustomerId(cust.id);
    d.setCustomer(cust.name);
    d.setCustSearch('');
    setShowCustomers(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Just a way back — no title bar, no step counter */}
        <View style={s.topRow}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Chosen customer pins above the field */}
          {d.customer.trim() ? (
            <View style={s.chipRow}>
              <View style={s.customerChip}>
                <User size={13} color={c.orangeDeep} strokeWidth={2.4} />
                <Text style={s.customerChipText} numberOfLines={1}>{d.customer.trim()}</Text>
                <TouchableOpacity
                  onPress={() => { d.setCustomerId(null); d.setCustomer(''); }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Remove customer"
                >
                  <X size={13} color={c.orangeDeep} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <TextInput
            style={s.field}
            placeholder={ex.placeholder}
            placeholderTextColor={c.muted}
            value={text}
            onChangeText={v => { touched.current = true; setText(v); if (d.error) d.setError(null); }}
            multiline
            textAlignVertical="top"
            autoFocus
            editable={!d.aiBusy && !transcribing}
          />

          {/* Input buttons */}
          <View style={s.inputRow}>
            <TouchableOpacity
              style={[s.iconBtn, listening && s.iconBtnLive]}
              activeOpacity={0.8}
              onPress={listening ? stopListening : startListening}
              disabled={transcribing || d.aiBusy}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop dictating' : 'Dictate the job'}
            >
              {transcribing
                ? <ActivityIndicator size="small" color={c.orange} />
                : listening
                  ? <Square size={16} color="#fff" strokeWidth={2.6} />
                  : <Mic size={18} color={c.ink} strokeWidth={2.2} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.iconBtn, s.iconBtnDisabled]}
              activeOpacity={1}
              disabled
              accessibilityRole="button"
              accessibilityLabel="Add photos — coming soon"
            >
              <Camera size={18} color={c.muted} strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.iconBtn}
              activeOpacity={0.8}
              onPress={() => setShowCustomers(true)}
              accessibilityRole="button"
              accessibilityLabel="Attach a customer"
            >
              <User size={18} color={c.ink} strokeWidth={2.2} />
            </TouchableOpacity>

            {listening ? <Text style={s.liveHint}>Listening — tap to stop</Text> : null}
          </View>

          {/* First-run examples — tap to fill */}
          {!text.trim() && !touched.current ? (
            <View style={s.examples}>
              {ex.samples.map((sample, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.exampleChip}
                  activeOpacity={0.75}
                  onPress={() => { touched.current = true; setText(sample); }}
                >
                  <Text style={s.exampleText}>{sample}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {d.error ? (
            <View style={s.errorBanner}><Text style={s.errorText}>{d.error}</Text></View>
          ) : null}
        </ScrollView>

        {/* Pinned primary */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.generateBtn, !canGenerate && { opacity: 0.45 }]}
            activeOpacity={0.85}
            onPress={onGenerate}
            disabled={!canGenerate}
            accessibilityRole="button"
            accessibilityLabel="Generate the quote"
          >
            {d.aiBusy
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.generateText}>Generate</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Customer search */}
      <Modal visible={showCustomers} transparent animationType="slide" onRequestClose={() => setShowCustomers(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowCustomers(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Attach a customer</Text>
          <TextInput
            style={s.search}
            placeholder="Search customers…"
            placeholderTextColor={c.muted}
            value={d.custSearch}
            onChangeText={d.setCustSearch}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {d.filteredCustomers.map((cust: any) => (
              <TouchableOpacity key={cust.id} style={s.custRow} activeOpacity={0.7} onPress={() => pickCustomer(cust)}>
                <View style={s.custAvatar}>
                  <Text style={s.custAvatarText}>{cust.name?.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.custName} numberOfLines={1}>{cust.name}</Text>
                  {cust.phone ? <Text style={s.custSub} numberOfLines={1}>{cust.phone}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
            {d.filteredCustomers.length === 0 ? (
              <Text style={s.emptyText}>No matches. You can skip this and attach someone when you send.</Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={s.skipBtn} activeOpacity={0.8} onPress={() => setShowCustomers(false)}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  topRow: { paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', marginBottom: 10 },
  customerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%',
    backgroundColor: c.orangeSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  customerChipText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep, flexShrink: 1 },
  field: {
    fontSize: 19, fontFamily: 'Manrope_600SemiBold', color: c.ink,
    lineHeight: 27, minHeight: 150, padding: 0, marginTop: 4,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  iconBtn: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineMid, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnLive: { backgroundColor: c.orange, borderColor: c.orange },
  iconBtnDisabled: { opacity: 0.4 },
  liveHint: { fontSize: 12.5, fontFamily: 'Manrope_700Bold', color: c.orange, flex: 1 },
  examples: { marginTop: 26, gap: 8 },
  exampleChip: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  exampleText: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.mutedHi, lineHeight: 20 },
  errorBanner: {
    marginTop: 16, backgroundColor: c.redSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.red },
  footer: {
    paddingTop: 12, paddingBottom: 12, paddingHorizontal: 20,
    backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.lineSoft,
  },
  generateBtn: {
    height: 58, borderRadius: 18, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  generateText: { fontSize: 16.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: c.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineMid, alignSelf: 'center' },
  sheetTitle: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 14 },
  search: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 12,
    fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  custAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  custAvatarText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  custName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink },
  custSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 1 },
  emptyText: {
    fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted,
    paddingVertical: 18, lineHeight: 19,
  },
  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  skipText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.muted },
});
