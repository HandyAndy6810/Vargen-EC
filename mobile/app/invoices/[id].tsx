import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInvoice, useUpdateInvoice } from '@/hooks/use-invoices';
import { useStripePaymentLink } from '@/hooks/use-stripe';
import { ChevronLeft, Download, Eye, Send, Check, CreditCard } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const BLUE        = '#1f6feb';
const GREEN       = '#2a9d4c';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';

const LINE_ITEMS = [
  { name: 'Rheem 315L Stellar HWU',     qty: 1, price: 1420 },
  { name: 'Removal + install labour',   qty: 2, price: 180  },
  { name: 'Expansion valve + fittings', qty: 1, price: 85   },
  { name: 'Callout fee',                qty: 1, price: 120  },
];

const PAYMENT_METHODS = [
  { label: 'Bank transfer',      detail: 'BSB 062-001 · 1234 5678' },
  { label: 'Credit / debit card', detail: 'Via Stripe · 1.9% + 30¢' },
  { label: 'PayID',              detail: 'andy@vargenezey.com.au' },
];

const subtotal = LINE_ITEMS.reduce((s, l) => s + l.price * l.qty, 0);
const gst = Math.round(subtotal * 0.1);
const total = subtotal + gst;

const GREEN_SOFT  = '#e5f6eb';
const GREEN_BORDER = '#bde2c9';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id ? Number(id) : 0) as any;
  const updateInvoice = useUpdateInvoice();
  const stripeLink = useStripePaymentLink();

  const handlePayByCard = () => {
    const invoiceId = id ? Number(id) : 0;
    if (!invoiceId) return;

    // If a link already exists on the invoice, open it directly
    if (invoice?.stripePaymentLinkUrl) {
      Linking.openURL(invoice.stripePaymentLinkUrl);
      return;
    }

    stripeLink.mutate(invoiceId, {
      onSuccess: (data) => Linking.openURL(data.url),
      onError: (err: any) => Alert.alert('Card payment unavailable', err.message),
    });
  };

  const handleMarkPaid = () => {
    const invoiceId = id ? Number(id) : 0;
    if (!invoiceId) return;
    Alert.alert('Mark as paid?', 'This will update the invoice status to Paid.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: () => updateInvoice.mutate({ id: invoiceId, status: 'paid', paidDate: new Date() as any }),
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  const title = invoice?.title || 'Hot water swap';
  const num = invoice?.invoiceNumber || `INV-${String(id).slice(-3)}`;
  const amount = invoice?.totalAmount ? parseFloat(invoice.totalAmount) : total;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.iconBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{num}</Text>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Download size={18} color={INK} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>

          {/* Amount due hero */}
          <View style={s.heroCard}>
            <View style={s.heroGlow} />
            <Text style={s.heroEyebrow}>Amount due</Text>
            <Text style={s.heroAmount}>${amount.toLocaleString()}</Text>
            <Text style={s.heroDue}>
              Due <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>Fri 3 May</Text> · 14 days
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={s.heroSecondaryBtn} activeOpacity={0.7}>
                <Eye size={14} color="#fff" strokeWidth={2} />
                <Text style={s.heroSecondaryBtnText}>View PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroPrimaryBtn} activeOpacity={0.8}>
                <Send size={14} color="#fff" strokeWidth={2} />
                <Text style={s.heroPrimaryBtnText}>Send reminder</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status */}
          <Text style={s.sectionEyebrow}>Status</Text>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.statusDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>Sent & viewed</Text>
                <Text style={s.statusSub}>Opened on mobile · 12 minutes ago</Text>
              </View>
            </View>
          </View>

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
            <View style={s.totalSection}>
              {[
                { label: 'Subtotal', value: subtotal, bold: false },
                { label: 'GST (10%)', value: gst, bold: false },
                { label: 'Total', value: total, bold: true },
              ].map((row) => (
                <View key={row.label} style={s.totalRow}>
                  <Text style={[s.totalLabel, row.bold && { color: INK, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }]}>
                    {row.label}
                  </Text>
                  <Text style={[s.totalValue, row.bold && { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }]}>
                    ${row.value.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment methods */}
          <Text style={s.sectionEyebrow}>Payment methods offered</Text>
          <View style={[s.card, { padding: 0 }]}>
            {PAYMENT_METHODS.map((pm, i) => (
              <View
                key={i}
                style={[s.pmRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.pmLabel}>{pm.label}</Text>
                  <Text style={s.pmDetail}>{pm.detail}</Text>
                </View>
                <Check size={14} color={GREEN} strokeWidth={2.5} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={s.bottomBar}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handlePayByCard}
            activeOpacity={0.8}
            disabled={stripeLink.isPending}
            style={s.cardBtn}
          >
            {stripeLink.isPending
              ? <ActivityIndicator size="small" color={INK} />
              : <CreditCard size={16} color={INK} strokeWidth={2.2} />}
            <Text style={s.cardBtnText}>Pay by card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMarkPaid}
            activeOpacity={0.8}
            disabled={updateInvoice.isPending}
            style={[s.markPaidBtn, { flex: 1 }]}
          >
            {updateInvoice.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Check size={18} color="#fff" strokeWidth={2.5} />}
            <Text style={s.markPaidBtnText}>Mark paid</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 4,
  },
  iconBtn: {
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
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: BLACK,
    borderRadius: 22,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${ORANGE}88`,
    opacity: 0.35,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.5,
    lineHeight: 46,
    marginTop: 6,
  },
  heroDue: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  heroSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroPrimaryBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
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
    padding: 16,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
  },
  statusTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  statusSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    width: 24,
    textAlign: 'right',
  },
  lineAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    minWidth: 60,
    textAlign: 'right',
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: LINE_SOFT,
    padding: 16,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pmLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  pmDetail: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  cardBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: LINE_SOFT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  markPaidBtn: {
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
  markPaidBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
