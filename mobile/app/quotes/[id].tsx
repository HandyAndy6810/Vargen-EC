import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuote, useQuoteItems } from '@/hooks/use-quotes';
import { ChevronLeft, MoreHorizontal, Phone, MessageSquare, Edit2 } from 'lucide-react-native';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLUE        = '#1f6feb';
const BLUE_SOFT   = '#eaf2ff';
const BLUE_BORDER = '#c8dcff';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

const STATUS_PILL: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
  draft:    { bg: PAPER_DEEP, fg: MUTED_HI,    bd: LINE_MID,          label: 'Draft' },
  sent:     { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER,       label: 'Sent' },
  viewed:   { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER,       label: 'Viewed' },
  accepted: { bg: GREEN_SOFT, fg: GREEN,        bd: `${GREEN}44`,      label: 'Accepted' },
  overdue:  { bg: ORANGE_SOFT, fg: ORANGE_DEEP, bd: `${ORANGE}44`,    label: 'Overdue' },
  invoiced: { bg: GREEN_SOFT, fg: GREEN,        bd: `${GREEN}44`,      label: 'Invoiced' },
};

const PROGRESS_STEPS = ['Drafted', 'Sent', 'Viewed', 'Accepted'];

function getProgressIndex(status: string): number {
  const map: Record<string, number> = { draft: 0, sent: 1, viewed: 2, accepted: 3, invoiced: 3 };
  return map[status] ?? 1;
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = id ? Number(id) : 0;
  const { data: quote, isLoading } = useQuote(quoteId) as any;
  const { data: quoteItems = [] } = useQuoteItems(quoteId) as any;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  // Parse content JSON
  let content: any = {};
  try { content = JSON.parse(quote?.content || '{}'); } catch {}

  const title = content.jobTitle || `Quote #${id}`;
  const customerName = content.customerName || '';
  const status = quote?.status || 'draft';
  const totalAmount = quote?.totalAmount ? parseFloat(quote.totalAmount) : 0;
  const pill = STATUS_PILL[status] ?? STATUS_PILL.draft;
  const progressIdx = getProgressIndex(status);
  const initials = customerName
    ? customerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const num = `Q-${String(id).padStart(4, '0').slice(-4)}`;
  const issueDate = quote?.createdAt
    ? format(new Date(quote.createdAt), 'EEE d MMM')
    : '';

  // Build display items: prefer saved quoteItems, fallback to content
  let displayItems: Array<{ name: string; qty: number; total: number }> = [];
  if ((quoteItems as any[]).length > 0) {
    displayItems = (quoteItems as any[]).map((item: any) => ({
      name: item.description,
      qty: item.quantity,
      total: parseFloat(item.price),
    }));
  } else if (content.items?.length > 0) {
    displayItems = content.items.map((item: any) => ({
      name: item.description,
      qty: item.quantity || 1,
      total: (item.quantity || 1) * (item.unitPrice || 0),
    }));
  } else if (content.lines?.length > 0) {
    displayItems = content.lines.map((line: any) => ({
      name: line.name,
      qty: line.qty || 1,
      total: (line.qty || 1) * (line.price || 0),
    }));
  }

  const subtotal = content.subtotal
    ? parseFloat(content.subtotal)
    : displayItems.reduce((s, i) => s + i.total, 0);
  const gst = content.gstAmount ? parseFloat(content.gstAmount) : 0;

  const customerPhone = content.customerPhone || null;
  const alreadyInvoiced = status === 'invoiced';

  const handleConvert = () => {
    if (alreadyInvoiced) {
      Alert.alert('Already invoiced', 'An invoice has already been created for this quote.');
      return;
    }
    router.push(`/invoices/create?quoteId=${id}` as any);
  };

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
          <MoreHorizontal size={18} color={INK} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>

          {/* Status hero */}
          <View style={s.statusCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={s.statusCardTitle} numberOfLines={1}>{title}</Text>
                <Text style={s.statusCardSub}>
                  {customerName ? `For ${customerName}` : 'No customer'}{issueDate ? ` · ${issueDate}` : ''}
                </Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: pill.bg, borderColor: pill.bd }]}>
                <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
              <Text style={s.amountLarge}>
                ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={s.amountSub}>inc GST</Text>
            </View>

            {/* Progress rail */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
              {PROGRESS_STEPS.map((step, i) => {
                const done = i < progressIdx;
                const cur = i === progressIdx;
                return (
                  <View key={step} style={{ flex: 1 }}>
                    <View style={[s.railBar, done ? { backgroundColor: ORANGE } : cur ? { backgroundColor: ORANGE_SOFT } : { backgroundColor: PAPER_DEEP }]} />
                    <Text style={[s.railLabel, done ? { color: ORANGE_DEEP } : cur ? { color: ORANGE } : { color: MUTED }]}>
                      {step}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Customer */}
          {customerName ? (
            <>
              <Text style={s.sectionEyebrow}>Customer</Text>
              <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={s.custAvatar}>
                  <Text style={s.custAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.custName}>{customerName}</Text>
                </View>
                {customerPhone ? (
                  <>
                    <TouchableOpacity
                      style={s.iconAction}
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                    >
                      <Phone size={16} color={INK} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.iconAction}
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(`sms:${customerPhone}`)}
                    >
                      <MessageSquare size={16} color={INK} strokeWidth={2} />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Line items */}
          <Text style={s.sectionEyebrow}>
            Line items{displayItems.length > 0 ? ` · ${displayItems.length}` : ''}
          </Text>
          <View style={[s.card, { padding: 0 }]}>
            {displayItems.length > 0 ? (
              displayItems.map((item, i) => (
                <View key={i} style={[s.lineRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                  <Text style={s.lineName}>{item.name}</Text>
                  <Text style={s.lineQty}>×{item.qty}</Text>
                  <Text style={s.lineAmt}>
                    ${item.total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED }}>
                  No line items recorded
                </Text>
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
                <Text style={[s.totalLabel, { color: INK, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }]}>
                  Total
                </Text>
                <Text style={[s.totalValue, { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }]}>
                  ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {content.notes ? (
            <>
              <Text style={s.sectionEyebrow}>Notes</Text>
              <View style={s.card}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED_HI, lineHeight: 20 }}>
                  {content.notes}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.tweakBtn} activeOpacity={0.7}>
          <Edit2 size={15} color={INK} strokeWidth={2} />
          <Text style={s.tweakBtnText}>Tweak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.convertBtn, alreadyInvoiced && { backgroundColor: PAPER_DEEP }]}
          activeOpacity={0.8}
          onPress={handleConvert}
        >
          <Text style={[s.convertBtnText, alreadyInvoiced && { color: MUTED_HI }]}>
            {alreadyInvoiced ? 'Already invoiced' : 'Convert to invoice ›'}
          </Text>
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
  statusCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  statusCardTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
  },
  statusCardSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  amountLarge: {
    fontSize: 36,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    letterSpacing: -1.1,
    lineHeight: 38,
  },
  amountSub: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  railBar: {
    height: 4,
    borderRadius: 999,
  },
  railLabel: {
    fontSize: 9.5,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 6,
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
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
  },
  custName: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 70,
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
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  tweakBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  tweakBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  convertBtn: {
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
  convertBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
