import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { useQuotes } from '@/hooks/use-quotes';
import { Plus, Search, Filter } from 'lucide-react-native';
type Quote = {
  id: number;
  userId: string | null;
  jobId: number | null;
  customerId: number | null;
  totalAmount: string;
  status: string | null;
  content: string | null;
  xeroInvoiceId: string | null;
  xeroInvoiceNumber: string | null;
  shareToken: string | null;
  followUpSchedule: string | null;
  sentAt: Date | null;
  createdAt: Date | null;
};

type QuoteWithJoins = Quote & { customerName?: string; expiresAt?: Date | null };

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const BLUE        = '#1f6feb';
const BLUE_SOFT   = '#eaf2ff';
const BLUE_BORDER = '#c8dcff';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const GREEN_BORDER = '#bde2c9';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

type Filter = 'all' | 'draft' | 'sent' | 'accepted' | 'overdue';

const STATUS_PILL: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
  draft:    { bg: PAPER_DEEP, fg: MUTED_HI,    bd: LINE_MID,    label: 'Draft' },
  sent:     { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER, label: 'Sent' },
  viewed:   { bg: BLUE_SOFT,  fg: BLUE,         bd: BLUE_BORDER, label: 'Viewed' },
  accepted: { bg: GREEN_SOFT, fg: GREEN,        bd: GREEN_BORDER, label: 'Accepted' },
  overdue:  { bg: ORANGE_SOFT, fg: ORANGE_DEEP, bd: 'rgba(242,106,42,0.3)', label: 'Overdue' },
  rejected: { bg: '#fde5e5', fg: '#d23b3b',    bd: 'rgba(210,59,59,0.3)', label: 'Declined' },
  invoiced: { bg: GREEN_SOFT, fg: GREEN,        bd: GREEN_BORDER, label: 'Invoiced' },
};

function parseTitle(quote: QuoteWithJoins): string {
  if (quote.title) return quote.title;
  try {
    const p = JSON.parse(quote.content || '{}');
    if (p.jobTitle) return p.jobTitle;
  } catch {}
  return `Quote #${quote.id}`;
}

export default function QuotesScreen() {
  const { data: quotes, isLoading, isError } = useQuotes();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const allQuotes = (quotes || []) as QuoteWithJoins[];

  const sorted = useMemo(
    () => [...allQuotes].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [allQuotes]
  );

  const overdueQuotes = sorted.filter((q) => q.status === 'sent' && q.expiresAt && new Date(q.expiresAt) < new Date());

  const filtered = useMemo(() => {
    let list = sorted;
    if (filter === 'overdue') list = overdueQuotes;
    else if (filter !== 'all') list = sorted.filter((q) => q.status === filter);
    if (search) list = list.filter((q) => parseTitle(q).toLowerCase().includes(search.toLowerCase()) || (q.customerName || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [sorted, filter, search]);

  const counts = useMemo(() => ({
    all:      sorted.length,
    draft:    sorted.filter((q) => q.status === 'draft').length,
    sent:     sorted.filter((q) => q.status === 'sent' || q.status === 'viewed').length,
    accepted: sorted.filter((q) => q.status === 'accepted').length,
    overdue:  overdueQuotes.length,
  }), [sorted]);

  const totalPipeline = sorted
    .filter((q) => ['sent', 'viewed', 'accepted'].includes(q.status || ''))
    .reduce((s, q) => s + parseFloat(String(q.totalAmount || '0')), 0);

  const overdueTotal = overdueQuotes.reduce((s, q) => s + parseFloat(String(q.totalAmount || '0')), 0);

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}><ActivityIndicator size="large" color={ORANGE} /></View>;
  }

  if (isError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}><Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>Couldn't load quotes</Text></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Quotes</Text>
          <Text style={s.title}>All quotes</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/quotes/create')} activeOpacity={0.8}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Pipeline hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={s.heroCard}>
          <View style={s.heroGlow} />
          <Text style={s.heroEyebrow}>Outstanding pipeline</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <Text style={s.heroAmt}>${totalPipeline.toLocaleString()}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Manrope_700Bold' }}>/ {counts.all} quotes</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: '#fff' }}>
              <Text style={{ color: ORANGE }}>● </Text>${overdueTotal.toLocaleString()} overdue
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.55)' }}>
              ●  ${(totalPipeline - overdueTotal).toLocaleString()} awaiting
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <View style={s.searchRow}>
          <Search size={16} color={MUTED} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search quotes, customers…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
          <Filter size={16} color={MUTED} strokeWidth={2} />
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow} style={{ maxHeight: 48 }}>
        {([
          { id: 'all', l: 'All', n: counts.all },
          { id: 'draft', l: 'Draft', n: counts.draft },
          { id: 'sent', l: 'Sent', n: counts.sent },
          { id: 'accepted', l: 'Accepted', n: counts.accepted },
          { id: 'overdue', l: 'Overdue', n: counts.overdue },
        ] as { id: Filter; l: string; n: number }[]).map((t) => {
          const active = filter === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setFilter(t.id)} activeOpacity={0.7}
              style={[s.tab, active && s.tabActive]}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.l}</Text>
              <View style={[s.tabBadge, active && { backgroundColor: ORANGE }]}>
                <Text style={[s.tabBadgeText, active && { color: '#fff' }]}>{t.n}</Text>
              </View>
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
              <Text style={{ fontSize: 28 }}>📋</Text>
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: INK, textAlign: 'center' }}>
              {search ? 'No quotes match that search' : filter !== 'all' ? `No ${filter} quotes` : 'No quotes yet'}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              {!search && filter === 'all' ? 'Create a quote with AI in seconds — just describe the job.' : 'Try a different filter or search term.'}
            </Text>
            {!search && filter === 'all' && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: ORANGE, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                activeOpacity={0.85}
                onPress={() => router.push('/quotes/create' as any)}
              >
                <Text style={{ fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>Create first quote</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((quote) => {
            const pill = STATUS_PILL[quote.status ?? 'draft'] ?? STATUS_PILL.draft;
            const title = parseTitle(quote);
            const amount = parseFloat(String(quote.totalAmount || '0'));
            return (
              <TouchableOpacity key={quote.id} onPress={() => router.push(`/quotes/${quote.id}`)} activeOpacity={0.7}
                style={s.quoteCard}>
                <View style={s.quoteAvatarWrap}>
                  <Text style={s.quoteAvatarText}>{String(quote.id).slice(-4)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={s.quoteTitle} numberOfLines={1}>{title}</Text>
                  </View>
                  <Text style={s.quoteMeta}>{quote.customerName || 'Customer'} · {quote.createdAt ? format(new Date(quote.createdAt), 'd MMM') : '—'}</Text>
                  <View style={{ marginTop: 6 }}>
                    <View style={[s.statusPill, { backgroundColor: pill.bg, borderColor: pill.bd }]}>
                      <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={s.quoteAmt}>${amount > 0 ? amount.toLocaleString() : '—'}</Text>
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
    paddingTop: 0,
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
    backgroundColor: BLACK,
    borderRadius: 22,
    padding: 18,
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
  heroAmt: {
    fontSize: 38,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: INK,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  tabBadge: {
    backgroundColor: PAPER_DEEP,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  quoteCard: {
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
  quoteAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quoteAvatarText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED_HI,
    letterSpacing: 0.5,
  },
  quoteTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.2,
    flex: 1,
  },
  quoteMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
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
  quoteAmt: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
});
