import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { useInvoices } from '@/hooks/use-invoices';
import { Receipt, User } from 'lucide-react-native';

const BRAND      = '#ea580c';
const INK        = '#1c1917';
const MUTED      = '#78716c';
const PAPER      = '#faf9f7';
const PAPER_DEEP = '#f0ece4';
const CARD       = '#ffffff';
const LINE       = '#e7e5e4';

const STATUS_META: Record<string, { bg: string; fg: string; label: string }> = {
  draft:   { bg: PAPER_DEEP, fg: '#57534e', label: 'Draft' },
  sent:    { bg: '#dbeafe',  fg: '#1d4ed8', label: 'Sent' },
  paid:    { bg: '#dcfce7',  fg: '#15803d', label: 'Paid' },
  overdue: { bg: '#fee2e2',  fg: '#b91c1c', label: 'Overdue' },
  void:    { bg: PAPER_DEEP, fg: '#a8a29e', label: 'Void' },
  partial: { bg: '#dbeafe',  fg: '#1d4ed8', label: 'Partial' },
};

export default function InvoicesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: invoices, isLoading, isError } = useInvoices();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const sorted = useMemo(
    () => [...(invoices || [])].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [invoices]
  );

  const totalOwed = useMemo(
    () => sorted.filter((i: any) => i.status === 'sent' || i.status === 'overdue').reduce((s, i: any) => s + parseFloat(i.totalAmount || '0'), 0),
    [sorted]
  );

  const totalPaid = useMemo(
    () => sorted.filter((i: any) => i.status === 'paid').reduce((s, i: any) => s + parseFloat(i.totalAmount || '0'), 0),
    [sorted]
  );

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
        <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>Couldn't load invoices</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Orange gradient hero */}
      <View style={s.heroCard}>
        <Text style={s.heroEyebrow}>INVOICES</Text>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 4 }}>
          <HeroStat label="Owed" value={`$${(totalOwed / 1000).toFixed(1)}k`} />
          <HeroStat label="Collected" value={`$${(totalPaid / 1000).toFixed(1)}k`} />
          <HeroStat label="Total" value={String(sorted.length)} suffix />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {sorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: PAPER_DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Receipt size={24} color={MUTED} />
            </View>
            <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>No invoices yet</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 4 }}>
              Accept a quote to generate your first invoice
            </Text>
          </View>
        ) : (
          sorted.map((invoice: any) => {
            const meta = STATUS_META[invoice.status] ?? STATUS_META.draft;
            const amount = parseFloat(invoice.totalAmount || '0');
            const num = invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : `#${invoice.id}`;
            return (
              <View key={invoice.id} style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{num}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={s.invoiceNum}>{`Invoice ${num}`}</Text>
                      <View style={[s.badge, { backgroundColor: meta.bg }]}>
                        <Text style={[s.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                      </View>
                    </View>
                    {invoice.customerName && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <User size={11} color={MUTED} />
                        <Text style={s.metaText}>{invoice.customerName}</Text>
                      </View>
                    )}
                    {amount > 0 && (
                      <Text style={s.amount}>
                        ${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    )}
                    {invoice.createdAt && (
                      <Text style={s.date}>{format(new Date(invoice.createdAt), 'd MMM yyyy')}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value, suffix }: { label: string; value: string; suffix?: boolean }) {
  return (
    <View>
      <Text style={{ fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.8 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroEyebrow: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
  invoiceNum: {
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
});
