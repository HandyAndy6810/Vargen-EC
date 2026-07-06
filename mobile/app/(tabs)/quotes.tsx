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
import { useState, useCallback, useMemo, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { useQuotes } from '@/hooks/use-quotes';
import { Plus, Search, Filter } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';

const BLUE        = '#1f6feb';
const BLUE_SOFT   = '#eaf2ff';
const BLUE_BORDER = '#c8dcff';

function fmtAUD(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type QuoteFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'overdue' | 'invoiced';

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

type QuoteWithJoins = Quote & { customerName?: string | null; expiryDate?: string | null; title?: string };

function parseTitle(quote: QuoteWithJoins): string {
  if (quote.title) return quote.title;
  try {
    const p = JSON.parse(quote.content || '{}');
    if (p.jobTitle) return p.jobTitle;
  } catch {}
  return `Quote #${quote.id}`;
}

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 16 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
    title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5, marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', shadowColor: c.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.33, shadowRadius: 14, elevation: 6 },
    heroCard: { backgroundColor: isDark ? c.card : '#0f0e0b', borderRadius: 22, padding: 18, overflow: 'hidden' },
    heroEyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase' },
    heroAmt: { fontSize: 38, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -1.2, lineHeight: 42 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft },
    searchInput: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.ink },
    tabsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 6 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft },
    tabActive: { backgroundColor: c.orange, borderColor: c.orange },
    tabText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
    tabTextActive: { color: '#fff' },
    tabBadge: { backgroundColor: c.paperDeep, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
    tabBadgeText: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted },
    quoteCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
    quoteAvatarWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.paperDeep, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    quoteAvatarText: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi, letterSpacing: 0.5 },
    quoteTitle: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2, flex: 1 },
    quoteMeta: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted },
    statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
    statusPillText: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 1.2, textTransform: 'uppercase' },
    quoteAmt: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3 },
  });
}

export default function QuotesScreen() {
  const { colors: c, isDark } = useTheme();
  const s = makeStyles(c, isDark);

  const STATUS_PILL: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
    draft:    { bg: c.paperDeep,  fg: c.mutedHi,    bd: c.lineSoft,              label: 'Draft' },
    sent:     { bg: BLUE_SOFT,    fg: BLUE,          bd: BLUE_BORDER,             label: 'Sent' },
    viewed:   { bg: BLUE_SOFT,    fg: BLUE,          bd: BLUE_BORDER,             label: 'Viewed' },
    accepted: { bg: c.greenSoft,  fg: c.green,       bd: `${c.green}44`,          label: 'Accepted' },
    overdue:  { bg: c.orangeSoft, fg: c.orangeDeep,  bd: `${c.orange}44`,         label: 'Overdue' },
    declined: { bg: c.redSoft,    fg: c.red,         bd: `${c.red}44`,            label: 'Declined' },
    rejected: { bg: c.redSoft,    fg: c.red,         bd: `${c.red}44`,            label: 'Declined' },
    invoiced: { bg: c.greenSoft,  fg: c.green,       bd: `${c.green}44`,          label: 'Invoiced' },
  };

  const { data: quotes, isLoading, isError } = useQuotes();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<QuoteFilter>((filterParam as QuoteFilter) || 'all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setFilter((filterParam as QuoteFilter) || 'all');
  }, [filterParam]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  // Treat errors as empty data so the screen is usable even without a server session
  const allQuotes = (isError ? [] : (quotes || [])) as QuoteWithJoins[];
  const sorted = useMemo(
    () => [...allQuotes]
      .map((q) => {
        let expiryDate: string | null = null;
        try {
          const c = q.content ? JSON.parse(q.content) : {};
          // Prefer the machine-readable ISO stamp — the display string is
          // user-editable free text and often unparseable
          expiryDate = c.expiryDateISO ?? c.expiryDate ?? null;
        } catch {}
        return { ...q, expiryDate };
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [allQuotes]
  );
  const overdueQuotes = sorted.filter((q) => {
    if (q.status !== 'sent' || !q.expiryDate) return false;
    const exp = new Date(q.expiryDate);
    return !isNaN(exp.getTime()) && exp < new Date();
  });

  const filtered = useMemo(() => {
    let list = sorted;
    if (filter === 'overdue') list = overdueQuotes;
    else if (filter === 'sent') list = sorted.filter((q) => q.status === 'sent' || q.status === 'viewed');
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
    invoiced: sorted.filter((q) => q.status === 'invoiced').length,
  }), [sorted]);

  const totalPipeline = sorted
    .filter((q) => ['sent', 'viewed', 'accepted'].includes(q.status || ''))
    .reduce((s, q) => s + parseFloat(String(q.totalAmount || '0')), 0);
  const overdueTotal = overdueQuotes.reduce((s, q) => s + parseFloat(String(q.totalAmount || '0')), 0);

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}><ActivityIndicator size="large" color={c.orange} /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Quotes</Text>
          <Text style={s.title}>All quotes</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/quotes/create')} activeOpacity={0.8}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={s.heroCard}>
          <View style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: `${c.orange}88`, opacity: 0.35 }} />
          <Text style={s.heroEyebrow}>Outstanding pipeline</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <Text style={s.heroAmt}>${fmtAUD(totalPipeline)}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Manrope_700Bold' }}>/ {counts.sent + counts.accepted} active</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: '#fff' }}>
              <Text style={{ color: c.orange }}>● </Text>${fmtAUD(overdueTotal)} overdue
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.55)' }}>
              ●  ${fmtAUD(totalPipeline - overdueTotal)} awaiting
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <View style={s.searchRow}>
          <Search size={16} color={c.muted} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search quotes, customers…"
            placeholderTextColor={c.muted}
            value={search}
            onChangeText={setSearch}
          />
          <Filter size={16} color={c.muted} strokeWidth={2} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow} style={{ maxHeight: 48 }}>
        {([
          { id: 'all',      l: 'All',      n: counts.all },
          { id: 'draft',    l: 'Draft',    n: counts.draft },
          { id: 'sent',     l: 'Sent',     n: counts.sent },
          { id: 'accepted', l: 'Accepted', n: counts.accepted },
          { id: 'overdue',  l: 'Overdue',  n: counts.overdue },
          { id: 'invoiced', l: 'Invoiced', n: counts.invoiced },
        ] as { id: QuoteFilter; l: string; n: number }[]).map((t) => {
          const active = filter === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setFilter(t.id)} activeOpacity={0.7}
              style={[s.tab, active && s.tabActive]}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.l}</Text>
              <View style={[s.tabBadge, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={[s.tabBadgeText, active && { color: '#fff' }]}>{t.n}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink }}>
              {filter === 'draft'    ? 'No drafts' :
               filter === 'sent'    ? 'Nothing sent yet' :
               filter === 'accepted' ? 'No accepted quotes' :
               filter === 'overdue' ? 'Nothing overdue — nice work 👌' :
               filter === 'invoiced' ? 'No invoiced quotes yet' :
               'No quotes yet'}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, textAlign: 'center', maxWidth: 240 }}>
              {filter === 'sent'    ? 'Open a draft and send it to a customer' :
               filter === 'accepted' ? 'Mark a sent quote as Accepted to see it here' :
               filter === 'overdue' ? 'Quotes past their expiry date appear here' :
               filter === 'invoiced' ? 'Convert an accepted quote to an invoice' :
               'Tap + to create your first quote'}
            </Text>
          </View>
        ) : (
          filtered.map((quote) => {
            const pill = STATUS_PILL[quote.status ?? 'draft'] ?? STATUS_PILL.draft;
            const title = parseTitle(quote);
            const amount = parseFloat(String(quote.totalAmount || '0'));
            return (
              <TouchableOpacity key={quote.id} onPress={() => router.push(`/quotes/${quote.id}`)} activeOpacity={0.7} style={s.quoteCard}>
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
                  <Text style={s.quoteAmt}>${amount > 0 ? fmtAUD(amount) : '—'}</Text>
                  <Text style={{ fontSize: 14, color: c.muted, fontFamily: 'Manrope_600SemiBold', marginTop: 4 }}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
