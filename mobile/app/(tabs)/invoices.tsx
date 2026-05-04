import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { useInvoices } from '@/hooks/use-invoices';
import { Plus, Sparkles } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const GREEN_BORDER = '#bde2c9';
const BLUE        = '#1f6feb';
const BLUE_SOFT   = '#eaf2ff';
const BLUE_BORDER = '#c8dcff';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

type Filter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const STATUS_PILL: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
  draft:   { bg: PAPER_DEEP, fg: MUTED_HI,    bd: LINE_MID,                    label: 'Draft' },
  sent:    { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER,                 label: 'Sent' },
  paid:    { bg: GREEN_SOFT, fg: GREEN,        bd: GREEN_BORDER,                label: 'Paid' },
  overdue: { bg: ORANGE_SOFT, fg: ORANGE_DEEP, bd: 'rgba(242,106,42,0.3)',     label: 'Overdue' },
  void:    { bg: PAPER_DEEP, fg: MUTED,        bd: LINE_SOFT,                   label: 'Void' },
};

export default function InvoicesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const { data: invoices, isLoading, isError } = useInvoices();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const sorted = useMemo(
    () => [...((invoices as any[]) || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [invoices]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    return sorted.filter((i: any) => i.status === filter);
  }, [sorted, filter]);

  const outstanding = useMemo(() =>
    sorted.filter((i: any) => ['sent', 'overdue'].includes(i.status)).reduce((s: number, i: any) => s + parseFloat(i.totalAmount || '0'), 0),
    [sorted]
  );
  const overdue = useMemo(() =>
    sorted.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + parseFloat(i.totalAmount || '0'), 0),
    [sorted]
  );
  const current = outstanding - overdue;

  const counts = useMemo(() => ({
    all:     sorted.length,
    draft:   sorted.filter((i: any) => i.status === 'draft').length,
    sent:    sorted.filter((i: any) => i.status === 'sent').length,
    paid:    sorted.filter((i: any) => i.status === 'paid').length,
    overdue: sorted.filter((i: any) => i.status === 'overdue').length,
  }), [sorted]);

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}><ActivityIndicator size="large" color={ORANGE} /></View>;
  }
  if (isError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}><Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>Couldn't load invoices</Text></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Invoices</Text>
          <Text style={s.title}>$ getting paid</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/invoices/create')} activeOpacity={0.8}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Orange gradient hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={s.heroCard}>
          <View style={s.heroGlow} />
          <Text style={s.heroEyebrow}>Outstanding · {sorted.filter((i: any) => i.status !== 'paid' && i.status !== 'void').length} invoices</Text>
          <Text style={s.heroAmt}>${outstanding.toLocaleString()}</Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: '#fff' }}>🔴 ${overdue.toLocaleString()} overdue</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.7)' }}>● ${current.toLocaleString()} current</Text>
          </View>
          <TouchableOpacity style={s.nudgeBtn} onPress={() => router.push('/ai-chat')} activeOpacity={0.8}>
            <Sparkles size={14} color="#fff" strokeWidth={2} />
            <Text style={s.nudgeBtnText}>Nudge overdue customers</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow} style={{ maxHeight: 48 }}>
        {([
          { id: 'all', l: 'All', n: counts.all },
          { id: 'draft', l: 'Draft', n: counts.draft },
          { id: 'sent', l: 'Sent', n: counts.sent },
          { id: 'paid', l: 'Paid', n: counts.paid },
          { id: 'overdue', l: 'Overdue', n: counts.overdue },
        ] as { id: Filter; l: string; n: number }[]).map((t) => {
          const active = filter === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setFilter(t.id)} activeOpacity={0.7}
              style={[s.tab, active && s.tabActive]}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.l}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: PAPER_DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28 }}>🧾</Text>
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: INK, textAlign: 'center' }}>
              {filter !== 'all' ? `No ${filter} invoices` : 'No invoices yet'}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              {filter === 'all' ? 'Convert an accepted quote to an invoice, or create a standalone invoice.' : 'Try a different filter.'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: ORANGE, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                activeOpacity={0.85}
                onPress={() => router.push('/invoices/create' as any)}
              >
                <Text style={{ fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>Create invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((inv: any) => {
            const pill = STATUS_PILL[inv.status] ?? STATUS_PILL.draft;
            const amount = parseFloat(inv.totalAmount || '0');
            const num = inv.invoiceNumber || String(inv.id).slice(-3);
            const amtColor = inv.status === 'paid' ? GREEN : inv.status === 'overdue' ? ORANGE_DEEP : INK;
            return (
              <TouchableOpacity key={inv.id} onPress={() => router.push(`/invoices/${inv.id}`)} activeOpacity={0.7}
                style={s.invCard}>
                <View style={[s.invAvatar, { backgroundColor: inv.status === 'overdue' ? ORANGE_SOFT : PAPER_DEEP }]}>
                  <Text style={[s.invAvatarText, { color: inv.status === 'overdue' ? ORANGE_DEEP : MUTED_HI }]}>{num}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.invTitle} numberOfLines={1}>{inv.title || `Invoice #${num}`}</Text>
                  <Text style={s.invMeta}>{inv.customerName || 'Customer'} · {inv.age || (inv.createdAt ? format(new Date(inv.createdAt), 'd MMM') : '—')}</Text>
                  <View style={{ marginTop: 6 }}>
                    <View style={[s.statusPill, { backgroundColor: pill.bg, borderColor: pill.bd }]}>
                      <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={[s.invAmt, { color: amtColor }]}>${amount > 0 ? amount.toLocaleString() : '—'}</Text>
                  <Text style={{ fontSize: 14, color: MUTED, fontFamily: 'Manrope_600SemiBold', marginTop: 4 }}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.33,
    shadowRadius: 14,
    elevation: 6,
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.33,
    shadowRadius: 40,
    elevation: 10,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroAmt: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.4,
    lineHeight: 46,
    marginTop: 6,
  },
  nudgeBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  nudgeBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  tabActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED_HI,
  },
  tabTextActive: {
    color: '#fff',
  },
  invCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  invAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  invAvatarText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.5,
  },
  invTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.2,
  },
  invMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  invAmt: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.3,
  },
});
