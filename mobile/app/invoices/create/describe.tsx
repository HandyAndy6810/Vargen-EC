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
import { ChevronLeft, Mic, Square, User, X, PencilLine, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';
import { useSettings } from '@/hooks/use-settings';
import { useCustomers } from '@/hooks/use-customers';
import { useQuotes } from '@/hooks/use-quotes';
import { showAlert } from '@/lib/dialogs';
import { describeAge } from '@/lib/quote-draft-cache';
import { hapticPress } from '@/lib/haptics';
import { API_BASE_URL } from '@/lib/api';

/**
 * Screen 1 of the invoice flow, deliberately the same screen as the quote flow's
 * Describe — same field, same mic, same customer button — with one addition that
 * belongs only here.
 *
 * Most invoices are for work that was already quoted, so "Choose from a quote" sits
 * at the top as the primary route: pick one and the whole invoice arrives populated
 * with the agreed prices. Describing the work is the fallback for jobs that never
 * had a quote, which is the minority.
 */
export default function InvoiceDescribeStep() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const accent = isDark ? c.orange : c.orangeDeep;
  const d = useInvoiceDraft();
  const { data: settings } = useSettings() as any;
  const { data: allCustomers } = useCustomers() as any;
  const { data: allQuotes } = useQuotes() as any;

  const [text, setText] = useState(d.summary || '');
  const [showCustomers, setShowCustomers] = useState(false);
  const [custQuery, setCustQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const touched = useRef(false);

  // Only offer the quote route when there's actually something to invoice.
  const invoiceableQuotes = useMemo(
    () => ((allQuotes as any[]) || []).filter(q => q.status !== 'declined' && q.status !== 'invoiced'),
    [allQuotes]
  );

  const customerMatches = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    const list = (allCustomers as any[]) || [];
    if (!q) return list.slice(0, 8);
    return list.filter((x: any) => String(x.name || '').toLowerCase().includes(q)).slice(0, 8);
  }, [custQuery, allCustomers]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  useAudioRecorderState(recorder);

  const canGenerate = !!text.trim() && !d.aiBusy && !listening && !transcribing;

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
        if (res.status === 401) throw new Error('Please sign in to use voice.');
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.message || `Transcription failed (${res.status}). Try again.`);
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

  const onGenerate = async () => {
    if (!text.trim()) return;
    const { ok } = await d.generateFromDescription(text.trim());
    if (ok) router.replace('/invoices/create/review');
  };

  const onManual = () => {
    d.setSummary(text.trim());
    d.startManual();
    router.replace('/invoices/create/review');
  };

  const onResume = () => {
    const r = d.restoreDraft();
    if (!r) return;
    const priced = (r.lines || []).some(l => l.name?.trim() && parseFloat(l.price || '0') > 0);
    if (priced) return router.replace('/invoices/create/review');
    touched.current = true;
    setText(r.summary || '');
  };

  const pickCustomer = (cust: any) => {
    hapticPress();
    d.setCustomerId(cust.id);
    d.setCustomer(cust.name);
    setShowCustomers(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={s.screenTitle}>New invoice</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {d.restorable ? (
            <View style={s.resumeCard}>
              <Text style={[s.resumeEyebrow, { color: accent }]}>
                Unfinished invoice · {describeAge(d.restorable.savedAt)}
              </Text>
              <Text style={s.resumeTitle} numberOfLines={2}>
                {d.restorable.jobTitle?.trim() || d.restorable.summary?.trim() || 'Untitled job'}
              </Text>
              <View style={s.resumeRow}>
                <TouchableOpacity style={s.resumeBtn} activeOpacity={0.85} onPress={onResume}>
                  <Text style={s.resumeBtnText}>Pick up where I left off</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.resumeGhost} activeOpacity={0.7} onPress={d.forgetSavedDraft}>
                  <Text style={[s.resumeGhostText, { color: accent }]}>Start fresh</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* The main road. Most invoices are for work that was already quoted, so
              this is the primary action rather than an option buried behind a
              chooser screen. */}
          {invoiceableQuotes.length ? (
            <TouchableOpacity
              style={s.quoteCard}
              activeOpacity={0.9}
              onPress={() => router.push('/invoices/create/quote-pick')}
              accessibilityRole="button"
              accessibilityLabel="Build this invoice from a quote"
            >
              <View style={s.quoteGlow} />
              <View style={s.quoteIcon}><FileText size={20} color="#fff" strokeWidth={2.2} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.quoteTitle}>Choose from a quote</Text>
                <Text style={s.quoteSub} numberOfLines={2}>
                  {invoiceableQuotes.length} ready to invoice — prices come across as agreed
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.55)" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : null}

          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orText}>or describe the work</Text>
            <View style={s.orLine} />
          </View>

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
            placeholder="What work did you do? Include hours, materials and anything extra you had to cover."
            placeholderTextColor={c.muted}
            value={text}
            onChangeText={v => { touched.current = true; setText(v); if (d.error) d.setError(null); }}
            multiline
            textAlignVertical="top"
            editable={!d.aiBusy && !transcribing}
          />

          <View style={s.inputRow}>
            <TouchableOpacity
              style={[s.iconBtn, listening && s.iconBtnLive]}
              activeOpacity={0.8}
              onPress={listening ? stopListening : startListening}
              disabled={transcribing || d.aiBusy}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop dictating' : 'Dictate the work'}
            >
              {transcribing
                ? <ActivityIndicator size="small" color={c.orange} />
                : listening
                  ? <Square size={16} color="#fff" strokeWidth={2.6} />
                  : <Mic size={18} color={c.ink} strokeWidth={2.2} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.iconBtn}
              activeOpacity={0.8}
              onPress={() => { setCustQuery(''); setShowCustomers(true); }}
              accessibilityRole="button"
              accessibilityLabel="Attach a customer"
            >
              <User size={18} color={c.ink} strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.manualBtn}
              activeOpacity={0.85}
              onPress={onManual}
              accessibilityRole="button"
              accessibilityLabel="Build the invoice manually"
            >
              <PencilLine size={16} color="#fff" strokeWidth={2.4} />
              <Text style={s.manualText}>Build it manually</Text>
            </TouchableOpacity>

            {listening ? <Text style={s.liveHint}>Listening…</Text> : null}
          </View>

          {d.error ? (
            <View style={s.errorBanner}><Text style={s.errorText}>{d.error}</Text></View>
          ) : null}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.generateBtn, !canGenerate && { opacity: 0.45 }]}
            activeOpacity={0.85}
            onPress={onGenerate}
            disabled={!canGenerate}
            accessibilityRole="button"
            accessibilityLabel="Build the invoice"
          >
            {d.aiBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.generateText}>Build the invoice</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showCustomers} transparent animationType="slide" onRequestClose={() => setShowCustomers(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowCustomers(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Attach a customer</Text>
          <TextInput
            style={s.search}
            placeholder="Search customers…"
            placeholderTextColor={c.muted}
            value={custQuery}
            onChangeText={setCustQuery}
          />
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {customerMatches.map((cust: any) => (
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
            {customerMatches.length === 0 ? (
              <Text style={s.emptyText}>
                {((allCustomers as any[]) || []).length === 0
                  ? "You haven't added any customers yet — you can attach one when you send."
                  : 'No matches. You can skip this and attach someone when you send.'}
              </Text>
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

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  screenTitle: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
  },
  // c.ink is a text token (near-white in dark), so the dark hero look has to be
  // asked for explicitly rather than borrowed from it.
  quoteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: isDark ? c.card : c.ink, borderRadius: 22, padding: 18,
    overflow: 'hidden', marginTop: 4,
  },
  quoteGlow: {
    position: 'absolute', top: -50, right: -50, width: 160, height: 160,
    borderRadius: 80, backgroundColor: `${c.orange}88`, opacity: 0.45,
  },
  quoteIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  quoteTitle: { fontSize: 16.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.3 },
  quoteSub: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 17 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.lineMid },
  orText: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  resumeCard: { backgroundColor: c.orangeSoft, borderRadius: 18, padding: 16, marginBottom: 16 },
  resumeEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  resumeTitle: { fontSize: 15.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink, lineHeight: 21, marginTop: 6 },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  resumeBtn: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  resumeBtnText: { fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  resumeGhost: { height: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  resumeGhostText: { fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold' },
  chipRow: { flexDirection: 'row', marginBottom: 10 },
  customerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%',
    backgroundColor: c.orangeSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  customerChipText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep, flexShrink: 1 },
  field: {
    fontSize: 17, fontFamily: 'Manrope_600SemiBold', color: c.ink,
    lineHeight: 25, minHeight: 110, padding: 0, marginTop: 2,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  iconBtn: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineMid, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnLive: { backgroundColor: c.orange, borderColor: c.orange },
  manualBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 46,
    paddingHorizontal: 16, borderRadius: 15, backgroundColor: c.orange,
  },
  manualText: { fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  liveHint: { fontSize: 12.5, fontFamily: 'Manrope_700Bold', color: c.orange, flex: 1 },
  errorBanner: { marginTop: 16, backgroundColor: c.redSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
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
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.paperDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  custAvatarText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
  custName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink },
  custSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 1 },
  emptyText: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, paddingVertical: 18, lineHeight: 19 },
  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  skipText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.muted },
});
