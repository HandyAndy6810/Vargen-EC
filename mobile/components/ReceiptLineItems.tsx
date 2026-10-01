import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { receiptItems, receiptTotalMismatch } from '@shared/receipt-check';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Warns when a receipt's total doesn't agree with its items. Shown under the
 * Total field, where the number to check is. Renders nothing when they agree.
 */
export function ReceiptTotalWarning({ total, items }: { total: unknown; items: unknown }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { itemsTotal, mismatch } = receiptTotalMismatch(total, items);
  if (!mismatch) return null;
  return (
    <View style={s.warn} accessibilityRole="alert">
      <AlertTriangle size={14} color={c.orangeDeep} strokeWidth={2.4} />
      <Text style={s.warnText}>
        These items add up to {money(itemsTotal)} but the total is {money(Number(total) || 0)}.
        Check the total against the receipt.
      </Text>
    </View>
  );
}

/**
 * The receipt's line items, as read by the scanner, with their sum. Used on the
 * scan review and on a saved receipt — the saved screen used to show none of
 * them, though they were stored.
 */
export function ReceiptLineItems({ items, title = 'Line items' }: { items: unknown; title?: string }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const list = receiptItems(items);
  if (list.length === 0) return null;
  const sum = list.reduce((acc, it) => acc + (Number.isFinite(it.amount) ? it.amount : 0), 0);

  return (
    <View style={s.card}>
      <Text style={s.label}>{title}</Text>
      {list.map((item, idx) => (
        <View key={idx} style={[s.row, idx > 0 && s.rowBorder]}>
          <Text style={s.desc} numberOfLines={2}>{item.description || 'Item'}</Text>
          <Text style={s.amt}>{Number.isFinite(item.amount) ? money(item.amount) : '—'}</Text>
        </View>
      ))}
      <View style={[s.row, s.rowBorder]}>
        <Text style={s.sumLabel}>Items add up to</Text>
        <Text style={s.sumAmt}>{money(sum)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  card: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  label: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.lineSoft },
  desc: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.ink },
  amt: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink },
  sumLabel: { flex: 1, fontSize: 12, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  sumAmt: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  warn: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: c.orangeSoft, borderRadius: 12, borderWidth: 1, borderColor: c.orange, padding: 10 },
  warnText: { flex: 1, fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.orangeDeep, lineHeight: 17 },
});
