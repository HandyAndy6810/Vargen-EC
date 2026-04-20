import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { useQuotes, useUpdateQuote, useDeleteQuote } from '@/hooks/use-quotes';
import { FileText, User, ChevronRight, Trash2 } from 'lucide-react-native';
import type { Quote } from '@shared/schema';

type QuoteWithJoins = Quote & { customerName?: string };

const BRAND      = '#ea580c';
const INK        = '#1c1917';
const MUTED      = '#78716c';
const PAPER      = '#faf9f7';
const PAPER_DEEP = '#f0ece4';
const CARD       = '#ffffff';
const LINE       = '#e7e5e4';

type Filter = 'all' | 'draft' | 'sent' | 'accepted' | 'overdue';

const STATUS_META: Record<string, { label: string; dot: string; bg: string; fg: string }> = {
  draft:    { label: 'Draft',    dot: '#a8a29e', bg: PAPER_DEEP, fg: '#57534e' },
  sent:     { label: 'Sent',     dot: '#2563eb', bg: '#dbeafe',  fg: '#1d4ed8' },
  accepted: { label: 'Accepted', dot: '#16a34a', bg: '#dcfce7',  fg: '#15803d' },
  rejected: { label: 'Declined', dot: '#dc2626', bg: '#fee2e2',  fg: '#b91c1c' },
  invoiced: { label: 'Invoiced', dot: '#7c3aed', bg: '#ede9fe',  fg: '#6d28d9' },
};

const NEXT_STATUSES: Record<string, { label: string; value: string }[]> = {
  draft:    [{ label: 'Mark as Sent', value: 'sent' }],
  sent:     [
    { label: 'Mark as Accepted', value: 'accepted' },
    { label: 'Mark as Declined', value: 'rejected' },
    { label: 'Revert to Draft',  value: 'draft' },
  ],
  rejected: [{ label: 'Re-send Quote', value: 'sent' }],
  accepted: [],
  invoiced: [],
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
  const { mutate: updateQuote } = useUpdateQuote();
  const { mutate: deleteQuote } = useDeleteQuote();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

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

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    if (filter === 'overdue') {
      return sorted.filter((q) => q.status === 'sent' && q.expiresAt && new Date(q.expiresAt) < new Date());
    }
    return sorted.filter((q) => q.status === filter);
  }, [sorted, filter]);

  const counts = useMemo(() => ({
    all:      sorted.length,
    draft:    sorted.filter((q) => q.status === 'draft').length,
    sent:     sorted.filter((q) => q.status === 'sent').length,
    accepted: sorted.filter((q) => q.status === 'accepted').length,
    overdue:  sorted.filter((q) => q.status === 'sent' && q.expiresAt && new Date(q.expiresAt) < new Date()).length,
  }), [sorted]);

  const totalValue = useMemo(
    () => sorted.filter((q) => q.status === 'accepted').reduce((s, q) => s + parseFloat(String(q.totalAmount || '0')), 0),
    [sorted]
  );

  const handleStatusPress = (quote: QuoteWithJoins) => {
    const options = NEXT_STATUSES[quote.status ?? 'draft'] ?? [];
    if (options.length === 0) return;
    const buttons = options.map((opt) => ({
      text: opt.label,
      onPress: () => updateQuote({ id: quote.id, status: opt.value }),
    }));
    buttons.push({ text: 'Cancel', onPress: () => {} });
    Alert.alert('Change Status', parseTitle(quote), buttons as any);
  };

  const handleDeletePress = (quote: QuoteWithJoins) => {
    Alert.alert('Delete Quote', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteQuote(quote.id) },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}>
        <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>Couldn't load quotes</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Dark summary ribbon */}
      <View style={s.heroCard}>
        <Text style={s.heroEyebrow}>QUOTES</Text>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 4 }}>
          <HeroStat label="Total" value={String(counts.all)} />
          <HeroStat label="Pending" value={String(counts.sent)} />
          <HeroStat label="Won" value={`$${(totalValue / 1000).toFixed(1)}k`} />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={{ maxHeight: 48 }}
      >
        {(['all', 'draft', 'sent', 'accepted', 'overdue'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            <Text style={[s.chipCount, filter === f && { color: 'rgba(255,255,255,0.65)' }]}>
              {counts[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: PAPER_DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <FileText size={24} color={MUTED} />
            </View>
            <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>No quotes here</Text>
          </View>
        ) : (
          filtered.map((quote) => {
            const meta = STATUS_META[quote.status ?? 'draft'] ?? STATUS_META.draft;
            const title = parseTitle(quote);
            const amount = parseFloat(String(quote.totalAmount || '0'));
            const canAct = (NEXT_STATUSES[quote.status ?? 'draft'] ?? []).length > 0;
            const canDelete = quote.status === 'draft' || quote.status === 'rejected';

            return (
              <View key={quote.id} style={s.quoteCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {/* Quote # avatar */}
                  <View style={s.quoteAvatar}>
                    <Text style={s.quoteAvatarNum}>Q{quote.id}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={s.quoteTitle} numberOfLines={2}>{title}</Text>
                      <View style={[s.badge, { backgroundColor: meta.bg }]}>
                        <Text style={[s.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                      </View>
                    </View>

                    {quote.customerName && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <User size={11} color={MUTED} />
                        <Text style={s.metaText}>{quote.customerName}</Text>
                      </View>
                    )}

                    {amount > 0 && (
                      <Text style={s.amount}>
                        ${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    )}

                    {quote.createdAt && (
                      <Text style={s.date}>{format(new Date(quote.createdAt), 'd MMM yyyy')}</Text>
                    )}
                  </View>
                </View>

                {(canAct || canDelete) && (
                  <View style={s.actRow}>
                    {canAct && (
                      <TouchableOpacity style={s.actBtn} onPress={() => handleStatusPress(quote)} activeOpacity={0.7}>
                        <Text style={s.actBtnText}>Update status</Text>
                        <ChevronRight size={12} color={BRAND} />
                      </TouchableOpacity>
                    )}
                    {canDelete && (
                      <TouchableOpacity onPress={() => handleDeletePress(quote)} activeOpacity={0.7} style={s.deleteBtn}>
                        <Trash2 size={14} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.8 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: '#0f0e0b',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroEyebrow: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PAPER_DEEP,
  },
  chipActive: {
    backgroundColor: INK,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipCount: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  quoteCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  quoteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteAvatarNum: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
  quoteTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    flex: 1,
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
    gap: 8,
  },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  actBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: BRAND,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
