import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Sparkles, PencilLine } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuoteDraft } from '@/hooks/use-quote-draft';

/**
 * Entry to the New Quote flow. Editing jumps straight to Review; arriving with a
 * customer already chosen (from a customer page) skips into the manual steps;
 * otherwise the tradie picks how to build it — AI or manually.
 */
export default function QuoteCreateEntry() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const { isEditing, customer } = useQuoteDraft();

  const prefilled = !isEditing && !!customer.trim();

  useEffect(() => {
    if (isEditing) router.replace('/quotes/create/review');
    else if (prefilled) router.replace('/quotes/create/customer');
  }, [isEditing, prefilled]);

  // Redirecting — render nothing to avoid a flash of the chooser
  if (isEditing || prefilled) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>New quote</Text>
          <Text style={s.title}>How do you want to build it?</Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 14, paddingBottom: 40 }}>
        <TouchableOpacity style={s.aiCard} activeOpacity={0.9} onPress={() => router.replace('/ai-chat')}>
          <View style={s.aiGlow} />
          <View style={s.aiIcon}><Sparkles size={22} color="#fff" strokeWidth={2} /></View>
          <Text style={s.aiTitle}>Describe it — let AI build it</Text>
          <Text style={s.aiSub}>Say or type the job in a sentence and AI drafts the whole quote, using your price book.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.manualCard} activeOpacity={0.85} onPress={() => router.push('/quotes/create/customer')}>
          <View style={[s.manualIcon]}><PencilLine size={20} color={c.orange} strokeWidth={2.2} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.manualTitle}>Build it manually</Text>
            <Text style={s.manualSub}>Step through customer, job and line items yourself — AI’s still one tap away if you want it.</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5, marginTop: 2 },

  // c.ink is a text token (near-white in dark mode) — using it as a surface made the
  // card white-on-white in dark. Keep the dark hero look in both themes.
  aiCard: { backgroundColor: isDark ? c.card : c.ink, borderRadius: 24, padding: 22, overflow: 'hidden' },
  aiGlow: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: `${c.orange}88`, opacity: 0.5 },
  aiIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, shadowColor: c.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6,
  },
  aiTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.4, marginBottom: 6 },
  aiSub: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.6)', lineHeight: 18 },

  manualCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.card,
    borderRadius: 20, borderWidth: 1, borderColor: c.lineSoft, padding: 18,
  },
  manualIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.orangeSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  manualTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
  manualSub: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 3, lineHeight: 17 },
});
