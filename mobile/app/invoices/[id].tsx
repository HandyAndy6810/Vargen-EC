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
import { ChevronLeft, Check, CreditCard, Building2 } from 'lucide-react-native';
import { format, differenceInCalendarDays } from 'date-fns';

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
const GREEN_SOFT  = '#e5f6eb';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';
const RED         = '#d23b3b';
const RED_SOFT    = '#fde5e5';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = id ? Number(id) : 0;
  const { data: invoice, isLoading } = useInvoice(invoiceId) as any;
  const updateInvoice = useUpdateInvoice();
  const stripeLink = useStripePaymentLink();

  const handlePayByCard = () => {
    if (!invoiceId) return;
    if (invoice?.stripePaymentLinkUrl) {
      Linking.openURL(invoice.stripePaymentLinkUrl);
      return;
    }
    stripeLink.mutate(invoiceId, {
      onSuccess: (data: any) => Linking.openURL(data.url),
      onError: (err: any) => Alert.alert('Card payment unavailable', err.message),
    });
  };

  const handleMarkPaid = () => {
    if (!invoiceId) return;
    Alert.alert('Mark as paid?', 'This will update the invoice status to Paid.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: () => updateInvoice.mutate({
          id: invoiceId,
          status: 'paid',
          paidDate: new Date().toISOString() as any,
        }),
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

  // Parse items JSON
  let invoiceItems: Array<{ description: string; quantity: number; unit?: string; unitPrice?: number; total?: number }> = [];
  try { invoiceItems = JSON.parse(invoice?.items || '[]'); } catch {}

  const subtotal = invoice?.subtotal ? parseFloat(invoice.subtotal) : 0;
  const gst = invoice?.gstAmount ? parseFloat(invoice.gstAmount) : 0;
  const totalAmount = invoice?.totalAmount ? parseFloat(invoice.totalAmount) : 0;
  const status = invoice?.status || 'draft';
  const num = invoice?.invoiceNumber || `INV-${String(id).slice(-3)}`;

  // Title: try to find job title from items or notes
  const firstItem = invoiceItems[0];
  const title = firstItem?.description
    ? (firstItem.description.length > 30 ? firstItem.description.slice(0, 27) + '…' : firstItem.description)
    : `Invoice ${num}`;

  // Due date
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
  const dueDays = dueDate ? differenceInCalendarDays(dueDate, new Date()) : null;
  const dueDateStr = dueDate ? format(dueDate, 'EEE d MMM') : null;
  const dueLine = dueDateStr
    ? `${dueDateStr} · ${dueDays !== null && dueDays >= 0 ? `${dueDays} days` : 'overdue'}`
    : null;

  // Status display
  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue' || (status === 'sent' && dueDays !== null && dueDays < 0);
  const statusColor = isPaid ? GREEN : isOverdue ? RED : BLUE;
  const statusTitle = isPaid ? 'Paid' : isOverdue ? 'Overdue' : status === 'draft' ? 'Draft' : status === 'partial' ? 'Partially paid' : 'Sent';
  const statusSub = isPaid
    ? (invoice?.paidDate ? `Paid on ${format(new Date(invoice.paidDate), 'EEE d MMM')}` : 'Payment received')
    : isOverdue
    ? `Was due ${dueDateStr || ''}`
    : status === 'partial'
    ? `$${parseFloat(invoice?.paidAmount || '0').toFixed(0)} received`
    : 'Awaiting payment';

  // Hero card colour: orange if overdue, dark otherwise
  const heroBg = isOverdue ? ORANGE_DEEP : BLACK;

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
        <View style={s.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>

          {/* Amount due hero */}
          <View style={[s.heroCard, { backgroundColor: heroBg }]}>
            <View style={s.heroGlow} />
            <Text style={s.heroEyebrow}>{isPaid ? 'Amount paid' : 'Amount due'}</Text>
            <Text style={s.heroAmount}>
              ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {dueLine && !isPaid ? (
              <Text style={s.heroDue}>
                Due <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>{dueLine}</Text>
              </Text>
            ) : null}
          </View>

          {/* Status */}
          <Text style={s.sectionEyebrow}>Status</Text>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>{statusTitle}</Text>
                <Text style={s.statusSub}>{statusSub}</Text>
              </View>
            </View>
          </View>

          {/* Charges */}
          <Text style={s.sectionEyebrow}>
            Charges{invoiceItems.length > 0 ? ` · ${invoiceItems.length} items` : ''}
          </Text>
          <View style={[s.card, { padding: 0 }]}>
            {invoiceItems.length > 0 ? (
              invoiceItems.map((item, i) => {
                const lineTotal = item.total ?? ((item.quantity || 1) * (item.unitPrice || 0));
                return (
                  <View key={i} style={[s.lineRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.lineName}>{item.description}</Text>
                      {item.unitPrice ? (
                        <Text style={s.lineMeta}>
                          {item.quantity} {item.unit || 'ea'} @ ${item.unitPrice.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={s.lineAmt}>
                      ${lineTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED }}>No items</Text>
              </View>
            )}
            <View style={s.totalSection}>
              {subtotal > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Subtotal</Text>
                  <Text style={s.totalValue}>
                    ${subtotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              {gst > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>GST (10%)</Text>
                  <Text style={s.totalValue}>
                    ${gst.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: INK, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }]}>Total</Text>
                <Text style={[s.totalValue, { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }]}>
                  ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment methods */}
          <Text style={s.sectionEyebrow}>Payment methods</Text>
          <View style={[s.card, { padding: 0 }]}>
            <View style={s.pmRow}>
              <View style={s.pmIcon}>
                <Building2 size={16} color={MUTED_HI} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pmLabel}>Bank transfer / EFT</Text>
                <Text style={s.pmDetail}>BSB & account on request</Text>
              </View>
              <Check size={14} color={GREEN} strokeWidth={2.5} />
            </View>
            <View style={[s.pmRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
              <View style={s.pmIcon}>
                <CreditCard size={16} color={MUTED_HI} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pmLabel}>Credit / debit card</Text>
                <Text style={s.pmDetail}>Via Stripe · 1.9% + 30¢</Text>
              </View>
              <Check size={14} color={GREEN} strokeWidth={2.5} />
            </View>
          </View>

          {/* Notes */}
          {invoice?.notes ? (
            <>
              <Text style={s.sectionEyebrow}>Notes</Text>
              <View style={s.card}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED_HI, lineHeight: 20 }}>
                  {invoice.notes}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Action bar */}
      {!isPaid ? (
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
      ) : (
        <View style={s.bottomBar}>
          <View style={[s.paidBadge]}>
            <Check size={18} color={GREEN} strokeWidth={2.5} />
            <Text style={s.paidBadgeText}>Invoice paid — all done</Text>
          </View>
        </View>
      )}
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
    paddingVertical: 12,
  },
  lineName: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    lineHeight: 18,
  },
  lineMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  lineAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    minWidth: 70,
    textAlign: 'right',
    flexShrink: 0,
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
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pmIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: CARD,
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
  paidBadge: {
    height: 54,
    borderRadius: 18,
    backgroundColor: GREEN_SOFT,
    borderWidth: 1,
    borderColor: `${GREEN}44`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  paidBadgeText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: GREEN,
  },
});
