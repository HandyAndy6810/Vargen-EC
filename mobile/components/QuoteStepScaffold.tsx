import { type ReactNode, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';

export const QUOTE_STEPS = ['Customer', 'Job', 'Items', 'Review'] as const;

/**
 * Shared chrome for the stepped New Quote screens: a back chevron, a progress
 * rail showing which of the four steps you're on, a scrollable body, and a
 * footer button PINNED to the bottom so Next/Save is always visible without
 * scrolling — the key ask from the redesign.
 */
export function QuoteStepScaffold({
  stepIndex,
  title,
  subtitle,
  children,
  footerLabel,
  onNext,
  nextDisabled,
  nextLoading,
  onBack,
  scroll = true,
  footer,
}: {
  stepIndex: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  onBack?: () => void;
  scroll?: boolean;
  /** Replaces the default single Next button (e.g. the Review step's two actions) */
  footer?: ReactNode;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const Body = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack ?? (() => router.back())} activeOpacity={0.7} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>New quote · {stepIndex + 1} of {QUOTE_STEPS.length}</Text>
            <Text style={s.title}>{title}</Text>
          </View>
        </View>

        {/* Progress rail */}
        <View style={s.rail}>
          {QUOTE_STEPS.map((step, i) => {
            const done = i < stepIndex;
            const cur = i === stepIndex;
            return (
              <View key={step} style={{ flex: 1 }}>
                <View style={[s.railBar, done ? { backgroundColor: c.orange } : cur ? { backgroundColor: c.orangeSoft } : { backgroundColor: c.paperDeep }]} />
                <Text style={[s.railLabel, done ? { color: c.orangeDeep } : cur ? { color: c.orange } : { color: c.muted }]}>{step}</Text>
              </View>
            );
          })}
        </View>

        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

        {Body}

        {/* Pinned footer */}
        <View style={s.footer}>
          {footer ?? (
            <TouchableOpacity
              style={[s.nextBtn, (nextDisabled || nextLoading) && { opacity: 0.5 }]}
              activeOpacity={0.85}
              onPress={onNext}
              disabled={nextDisabled || nextLoading}
              accessibilityRole="button"
              accessibilityLabel={footerLabel}
            >
              {nextLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.nextText}>{footerLabel}</Text>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5, marginTop: 2 },
  rail: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 8 },
  railBar: { height: 4, borderRadius: 2 },
  railLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', marginTop: 6, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, paddingHorizontal: 20, marginTop: 6, marginBottom: 4, lineHeight: 18 },
  footer: {
    paddingTop: 12, paddingBottom: 34, paddingHorizontal: 16,
    backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.lineSoft,
    shadowColor: '#141310', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 12,
  },
  nextBtn: {
    height: 58, borderRadius: 18, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  nextText: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
