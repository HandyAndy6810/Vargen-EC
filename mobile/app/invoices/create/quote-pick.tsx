import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuotes } from '@/hooks/use-quotes';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';
import { quoteTitle as resolveQuoteTitle } from '@shared/mobile-types';

// Accepted first, then sent/viewed, then the rest — the ones you're most likely
// to be invoicing bubble to the top.
const RANK: Record<string, number> = { accepted: 0, sent: 1, viewed: 1 };

export default function QuotePickStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = useInvoiceDraft();
  const { data, isLoading } = useQuotes();

  const quotes = useMemo(() => {
    const list = ((data as any[]) || []).filter(q => q.status !== 'invoiced' && q.status !== 'declined');
    return [...list].sort((a, b) => (RANK[a.status] ?? 2) - (RANK[b.status] ?? 2));
  }, [data]);

  const pick = (id: number) => {
    d.setSelectedQuoteId(id);
    router.push('/invoices/create/from-quote');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>New invoice</Text>
          <Text style={s.title}>Pick a quote</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.orange} /></View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={q => String(q.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => pick(item.id)}>
              <View style={s.icon}><FileText size={17} color={c.orange} strokeWidth={2.2} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{resolveQuoteTitle(item)}</Text>
                <Text style={s.rowSub} numberOfLines={1}>
                  {(item.customerName || 'No customer')} · {String(item.status || 'draft')}
                </Text>
              </View>
              <Text style={s.amount}>${Number(item.totalAmount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <ChevronRight size={16} color={c.muted} strokeWidth={2} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink }}>No quotes to invoice</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, textAlign: 'center' }}>Accepted and sent quotes show up here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card,
    borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, paddingHorizontal: 14, paddingVertical: 13,
  },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.orangeSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
  rowSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2, textTransform: 'capitalize' },
  amount: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink, flexShrink: 0 },
});
