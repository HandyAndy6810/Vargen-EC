import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useQuoteDraft } from '@/hooks/use-quote-draft';
import { showConfirm } from '@/lib/dialogs';

const AI_STEPS = ['Describe', 'Review'] as const;

/**
 * The AI door into the quote flow. Deliberately ONE field — say the job in a
 * sentence — because the point of the AI path is that you don't fill in a form.
 * On success it fills the shared draft and hands over to the same Review screen
 * a manual quote ends on, so there's a single review/edit/save experience.
 */
export default function DescribeStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = useQuoteDraft();
  const [text, setText] = useState(d.summary || '');

  const run = async () => {
    const ok = await d.generateFromDescription(text.trim());
    if (ok) router.replace('/quotes/create/review');
  };

  const onGenerate = () => {
    if (!text.trim()) { d.setError('Describe the job first'); return; }
    showConfirm({
      title: 'Your quote, your call',
      message: 'By continuing, you take full ownership of this AI-generated quote. You are responsible for checking the pricing, scope and compliance before you send it to a customer.',
      confirmLabel: 'I understand',
      onConfirm: run,
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

  return (
    <QuoteStepScaffold
      stepIndex={0}
      steps={AI_STEPS}
      title="Describe the job"
      subtitle="A sentence or two is enough — AI builds the line items, then you review and adjust everything before it's saved."
      footerLabel={d.aiBusy ? 'Building your quote…' : 'Build my quote'}
      onNext={onGenerate}
      nextLoading={d.aiBusy}
      nextDisabled={d.aiBusy}
      onBack={onBack}
    >
      <View style={s.promptCard}>
        <View style={s.promptHead}>
          <View style={s.promptIcon}><Sparkles size={16} color="#fff" strokeWidth={2.2} /></View>
          <Text style={s.promptLabel}>The job</Text>
        </View>
        <TextInput
          style={s.promptInput}
          placeholder="e.g. Replace a 250L electric hot water system in a single-storey house, old unit needs removing and disposing of."
          placeholderTextColor={c.muted}
          value={text}
          onChangeText={v => { setText(v); if (d.error) d.setError(null); }}
          multiline
          textAlignVertical="top"
          autoFocus
          editable={!d.aiBusy}
        />
      </View>

      {d.error ? (
        <View style={s.errorBanner}><Text style={s.errorText}>{d.error}</Text></View>
      ) : null}

      {d.aiBusy ? (
        <View style={s.busyRow}>
          <ActivityIndicator color={c.orange} />
          <Text style={s.busyText}>Pricing it up against your rates and price book…</Text>
        </View>
      ) : (
        <Text style={s.hint}>
          Mention anything that changes the price — access, height, materials, how old the existing setup is.
        </Text>
      )}
    </QuoteStepScaffold>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  promptCard: {
    backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.lineMid,
    padding: 16, marginTop: 8,
  },
  promptHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  promptIcon: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  promptLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  promptInput: {
    fontSize: 16, fontFamily: 'Manrope_500Medium', color: c.ink,
    minHeight: 150, lineHeight: 23, padding: 0,
  },
  hint: {
    fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted,
    marginTop: 14, lineHeight: 19,
  },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  busyText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.muted, lineHeight: 18 },
  errorBanner: {
    marginTop: 12, backgroundColor: c.redSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.red },
});
