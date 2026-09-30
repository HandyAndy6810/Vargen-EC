import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Plus, ChevronRight } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useReceipts } from '@/hooks/use-receipts';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * What this job has cost so far, from the receipts attached to it. The same
 * receipts are what the profit check counts as materials once the job is done,
 * so the two can't disagree.
 */
export function JobCosts({ jobId }: { jobId: number }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: receipts } = useReceipts();

  const mine = useMemo(
    () => ((receipts as any[]) || []).filter((r) => r.jobId === jobId),
    [receipts, jobId],
  );
  const total = mine.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);

  return (
    <>
      <View style={s.headRow}>
        <Text style={s.eyebrow}>Costs</Text>
        {mine.length > 0 ? <Text style={s.total}>{money(total)}</Text> : null}
      </View>
      <View style={s.card}>
        {mine.map((r, i) => (
          <TouchableOpacity
            key={r.id}
            style={[s.row, i > 0 && s.rowBorder]}
            onPress={() => router.push(`/receipts/${r.id}` as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Receipt from ${r.vendor || 'unknown vendor'}`}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.vendor} numberOfLines={1}>{r.vendor || 'Unknown vendor'}</Text>
              <Text style={s.sub}>
                {[r.category, r.receiptDate ? format(new Date(r.receiptDate), 'd MMM') : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={s.amount}>{money(parseFloat(r.totalAmount) || 0)}</Text>
            <ChevronRight size={14} color={c.muted} strokeWidth={2} />
          </TouchableOpacity>
        ))}
        {mine.length === 0 ? (
          <Text style={s.empty}>No receipts yet. Add what you spend on this job to see what it really made you.</Text>
        ) : null}
        <TouchableOpacity
          style={[s.addBtn, mine.length > 0 && s.rowBorder]}
          onPress={() => router.push(`/receipts/scan?jobId=${jobId}` as any)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add receipt"
        >
          <Plus size={15} color={c.orange} strokeWidth={2.4} />
          <Text style={s.addText}>Add receipt</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase' },
  total: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  card: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.lineSoft },
  vendor: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink },
  sub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
  amount: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  empty: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, lineHeight: 17 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  addText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
});
