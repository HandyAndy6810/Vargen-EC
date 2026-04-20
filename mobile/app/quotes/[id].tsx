import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuote } from '@/hooks/use-quotes';
import { ChevronLeft, MoreHorizontal, Phone, MessageSquare, Edit2 } from 'lucide-react-native';

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
  draft:    { bg: PAPER_DEEP, fg: MUTED_HI,    bd: LINE_MID,     label: 'Draft' },
  sent:     { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER,  label: 'Sent' },
  viewed:   { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER,  label: 'Viewed' },
  accepted: { bg: GREEN_SOFT, fg: GREEN,        bd: `${GREEN}44`, label: 'Accepted' },
  overdue:  { bg: ORANGE_SOFT, fg: ORANGE_DEEP, bd: `${ORANGE}44`, label: 'Overdue' },
};

const PROGRESS_STEPS = ['Drafted', 'Sent', 'Viewed', 'Accepted'];

const LINE_ITEMS = [
  { name: 'Rheem 315L Stellar HWU',     qty: 1, price: 1420 },
  { name: 'Removal + install labour',   qty: 2, price: 180  },
  { name: 'Expansion valve + fittings', qty: 1, price: 85   },
  { name: 'Callout fee',                qty: 1, price: 120  },
];

const HISTORY = [
  { title: 'Viewed on mobile',  ago: '12m', color: BLUE },
  { title: 'SMS delivered',     ago: '18m', color: GREEN },
  { title: 'AI drafted quote',  ago: '1h',  color: ORANGE },
];

const subtotal = LINE_ITEMS.reduce((s, l) => s + l.price * l.qty, 0);
const gst = Math.round(subtotal * 0.1);
const total = subtotal + gst;

function getProgressIndex(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'sent') return 1;
  if (status === 'viewed') return 2;
  if (status === 'accepted') return 3;
  return 1;
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quote } = useQuote(id ? Number(id) : 0) as any;

  const title = quote?.title || 'Hot water swap';
  const customerName = quote?.customerName || 'Jack Dalton';
  const status = quote?.status || 'sent';
  const amount = quote?.totalAmount ? parseFloat(quote.totalAmount) : total;
  const pill = STATUS_PILL[status] ?? STATUS_PILL.draft;
  const progressIdx = getProgressIndex(status);
  const initials = customerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const num = `Q-${String(id).slice(-4)}`;

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
                <Text style={s.statusCardSub}>For {customerName} · Issued Sun 19 Apr</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: pill.bg, borderColor: pill.bd }]}>
                <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
              <Text style={s.amountLarge}>${amount.toLocaleString()}</Text>
              <Text style={s.amountSub}>inc GST</Text>
            </View>

            {/* Progress rail */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
              {PROGRESS_STEPS.map((step, i) => {
                const done = i < progressIdx;
                const cur = i === progressIdx;
                return (
                  <View key={step} style={{ flex: 1 }}>
                    <View style={[
                      s.railBar,
                      done ? { backgroundColor: ORANGE } : cur ? { backgroundColor: ORANGE_SOFT } : { backgroundColor: PAPER_DEEP },
                    ]} />
                    <Text style={[
                      s.railLabel,
                      done ? { color: ORANGE_DEEP } : cur ? { color: ORANGE } : { color: MUTED },
                    ]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Customer */}
          <Text style={s.sectionEyebrow}>Customer</Text>
          <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={s.custAvatar}>
              <Text style={s.custAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.custName}>{customerName}</Text>
              <Text style={s.custSub}>42 Harbour St, Rozelle · 5 previous jobs</Text>
            </View>
            <TouchableOpacity style={s.iconAction} activeOpacity={0.7}>
              <Phone size={16} color={INK} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconAction} activeOpacity={0.7}>
              <MessageSquare size={16} color={INK} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Line items */}
          <Text style={s.sectionEyebrow}>Line items · {LINE_ITEMS.length}</Text>
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

          {/* History */}
          <Text style={s.sectionEyebrow}>History</Text>
          <View style={[s.card, { padding: 0 }]}>
            {HISTORY.map((h, i) => (
              <View key={i} style={[s.historyRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <View style={[s.historyIcon, { backgroundColor: h.color + '22' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: h.color }} />
                </View>
                <Text style={s.historyTitle}>{h.title}</Text>
                <Text style={s.historyAgo}>{h.ago}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.tweakBtn} activeOpacity={0.7}>
          <Edit2 size={15} color={INK} strokeWidth={2} />
          <Text style={s.tweakBtnText}>Tweak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.convertBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/invoices/create')}
        >
          <Text style={s.convertBtnText}>Convert to invoice ›</Text>
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
  custSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
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
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  historyAgo: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
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
