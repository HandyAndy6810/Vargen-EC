import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Sparkles, ChevronRight } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const MUTED       = 'rgba(20,19,16,0.55)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

const SUMMARY = [
  { label: 'Duration',     value: '1h 52m' },
  { label: 'Quote total',  value: '$2,004' },
  { label: 'Actuals',      value: '$1,980 (-$24 parts)' },
  { label: 'Photos',       value: '4 attached' },
];

export default function JobCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Back button */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Completion hero */}
        <View style={s.hero}>
          <View style={s.checkCircle}>
            <Check size={40} color={GREEN} strokeWidth={2.5} />
          </View>
          <Text style={s.heroEyebrow}>Job complete</Text>
          <Text style={s.heroTitle}>
            Hot water swap{'\n'}
            <Text style={{ color: ORANGE }}>wrapped.</Text>
          </Text>
          <Text style={s.heroSub}>1h 52m · 7 minutes over estimate</Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Summary table */}
          <View style={s.summaryCard}>
            {SUMMARY.map((row, i) => (
              <View
                key={row.label}
                style={[s.summaryRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
              >
                <Text style={s.summaryLabel}>{row.label}</Text>
                <Text style={s.summaryValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Next step — generate invoice */}
          <Text style={s.sectionEyebrow}>Next step</Text>
          <TouchableOpacity
            style={s.invoiceNudge}
            activeOpacity={0.85}
            onPress={() => router.push('/invoices/create')}
          >
            <View style={s.nudgeIcon}>
              <Sparkles size={20} color="#fff" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nudgeEyebrow}>Suggested</Text>
              <Text style={s.nudgeTitle}>Generate invoice from this job</Text>
            </View>
            <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.finishBtn}
          activeOpacity={0.7}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={s.finishBtnText}>Finish</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.makeInvoiceBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/invoices/create')}
        >
          <Text style={s.makeInvoiceBtnText}>Make invoice ›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GREEN_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 34,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    marginTop: 22,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  invoiceNudge: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  nudgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  nudgeTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  finishBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  makeInvoiceBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  makeInvoiceBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
