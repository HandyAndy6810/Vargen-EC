import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuoteDraft } from '@/hooks/use-quote-draft';

/**
 * Screen 2, and only when the AI genuinely couldn't price something without asking.
 * A usable quote already exists by the time we get here — these answers only refine
 * it — so every question can be skipped, and skipping records a visible assumption
 * rather than blocking the tradie.
 */
export default function ClarifyStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = useQuoteDraft();

  const questions = d.questions;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() => questions.map(() => null));
  const [typed, setTyped] = useState('');

  // Nothing to ask (or we've already dealt with them) — don't strand the user here.
  useEffect(() => {
    if (!questions.length) router.replace('/quotes/create/review');
  }, [questions.length]);

  if (!questions.length) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  const q = questions[Math.min(idx, questions.length - 1)];

  const commit = async (next: (string | null)[]) => {
    setAnswers(next);
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setTyped('');
      return;
    }
    await d.finishClarify(next);
    router.replace('/quotes/create/review');
  };

  const answer = (value: string) => {
    const next = [...answers];
    next[idx] = value;
    commit(next);
  };

  const skipOne = () => {
    const next = [...answers];
    next[idx] = null;
    commit(next);
  };

  const skipAll = async () => {
    const next = answers.map((a, i) => (i < idx ? a : null));
    setAnswers(next);
    await d.finishClarify(next);
    router.replace('/quotes/create/review');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topRow}>
          <TouchableOpacity
            onPress={() => router.replace('/quotes/create/review')}
            activeOpacity={0.7}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to the quote"
          >
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          {/* Position dots — no "step 2 of 3" counter */}
          <View style={s.dots}>
            {questions.map((_, i) => (
              <View key={i} style={[s.dot, i === idx && { backgroundColor: c.orange, width: 18 }]} />
            ))}
          </View>
        </View>

        {d.aiBusy ? (
          <View style={s.busy}>
            <ActivityIndicator color={c.orange} size="large" />
            <Text style={s.busyText}>Updating your quote…</Text>
          </View>
        ) : (
          <View style={s.body}>
            <Text style={s.eyebrow}>One thing that changes the price</Text>
            <Text style={s.question}>{q.q}</Text>

            {q.type === 'toggle' ? (
              <View style={s.chips}>
                {['Yes', 'No'].map(opt => (
                  <TouchableOpacity key={opt} style={s.chip} activeOpacity={0.8} onPress={() => answer(opt)}>
                    <Text style={s.chipText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : q.type === 'number' ? (
              <View style={s.numberRow}>
                <TextInput
                  style={s.numberInput}
                  value={typed}
                  onChangeText={setTyped}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={c.muted}
                  autoFocus
                />
                {q.unit ? <Text style={s.unit}>{q.unit}</Text> : null}
                <TouchableOpacity
                  style={[s.useBtn, !typed.trim() && { opacity: 0.4 }]}
                  activeOpacity={0.85}
                  disabled={!typed.trim()}
                  onPress={() => answer(q.unit ? `${typed.trim()} ${q.unit}` : typed.trim())}
                >
                  <Text style={s.useBtnText}>Use</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.chips}>
                {(q.options.length ? q.options : ['Yes', 'No']).map(opt => (
                  <TouchableOpacity key={opt} style={s.chip} activeOpacity={0.8} onPress={() => answer(opt)}>
                    <Text style={s.chipText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {q.assumption ? (
              <Text style={s.assumption}>Skip and we'll quote it as: {q.assumption}</Text>
            ) : null}
          </View>
        )}

        {!d.aiBusy ? (
          <View style={s.footer}>
            <TouchableOpacity onPress={skipOne} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Skip this question">
              <Text style={s.skipText}>Skip this one</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={skipAll} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Skip all questions">
              <Text style={[s.skipText, { color: c.orange }]}>Skip all</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.lineMid },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  eyebrow: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  question: {
    fontSize: 24, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
    letterSpacing: -0.5, lineHeight: 31, marginTop: 10,
  },
  chips: { gap: 10, marginTop: 26 },
  chip: {
    minHeight: 56, borderRadius: 16, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineMid,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  chipText: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: c.ink, textAlign: 'center' },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26 },
  numberInput: {
    flex: 1, height: 56, borderRadius: 16, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineMid, paddingHorizontal: 16,
    fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
  },
  unit: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.muted },
  useBtn: { height: 56, paddingHorizontal: 22, borderRadius: 16, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
  useBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  assumption: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, lineHeight: 19, marginTop: 20 },
  busy: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  busyText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.muted },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
  },
  skipText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.muted },
});
