import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Send } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

const LINE_ITEMS = [
  { name: 'Rheem 315L HWU',    qty: 1, price: 1420 },
  { name: 'Labour',            qty: 2, price: 180  },
  { name: 'Valve + fittings',  qty: 1, price: 85   },
  { name: 'Callout',           qty: 1, price: 120  },
];

const subtotal = LINE_ITEMS.reduce((s, l) => s + l.price * l.qty, 0);
const gst = Math.round(subtotal * 0.1);
const total = subtotal + gst;

function FormField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={ff.label}>{label}</Text>
      <View style={ff.field}>
        <Text style={[ff.text, !value && { color: MUTED }]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const ff = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  field: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
});

export default function InvoiceCreateScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>New invoice</Text>
          <Text style={s.title}>Turn a job into cash</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>

        {/* AI pre-fill card */}
        <View style={s.prefillCard}>
          <View style={s.prefillIcon}>
            <Sparkles size={20} color="#fff" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.prefillEyebrow}>Pre-filled from</Text>
            <Text style={s.prefillTitle}>Job J-91 · Hot water swap</Text>
            <Text style={s.prefillSub}>4 line items · $2,004 total</Text>
          </View>
        </View>

        {/* Details */}
        <Text style={s.sectionEyebrow}>Details</Text>
        <FormField label="Customer" value="Jack Dalton" />
        <FormField label="Reference" value="Hot water swap — 21 Apr" />
        <FormField label="Due date" value="Fri 3 May (14 days)" />

        {/* Charges */}
        <Text style={s.sectionEyebrow}>Charges</Text>
        <View style={[s.card, { padding: 0 }]}>
          {LINE_ITEMS.map((item, i) => (
            <View
              key={i}
              style={[s.lineRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
            >
              <Text style={s.lineName}>{item.name}</Text>
              <Text style={s.lineQty}>×{item.qty}</Text>
              <Text style={s.lineAmt}>${(item.price * item.qty).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Total band */}
        <View style={s.totalBand}>
          <Text style={s.totalBandLabel}>Total · inc GST</Text>
          <Text style={s.totalBandAmount}>${total.toLocaleString()}</Text>
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.draftBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Text style={s.draftBtnText}>Save draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.sendBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Send size={16} color="#fff" strokeWidth={2} />
          <Text style={s.sendBtnText}>Send invoice</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
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
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  prefillCard: {
    backgroundColor: ORANGE_SOFT,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,106,42,0.3)',
    marginTop: 4,
  },
  prefillIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefillEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  prefillTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    marginTop: 2,
  },
  prefillSub: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: ORANGE_DEEP,
    marginTop: 1,
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
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lineName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  lineQty: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  lineAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  totalBand: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: BLACK,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalBandLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  totalBandAmount: {
    fontSize: 30,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    letterSpacing: -1,
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
  draftBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  sendBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  sendBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
