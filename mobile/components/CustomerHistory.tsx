import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuotes } from '@/hooks/use-quotes';
import { useInvoices } from '@/hooks/use-invoices';
import { useJobs } from '@/hooks/use-jobs';
import { quoteTitle } from '@shared/mobile-types';
import { invoiceOwing, summariseInvoices } from '@shared/invoice-figures';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SHOW = 5;

/**
 * Everything done for one customer: their quotes, invoices and jobs, newest
 * first, and what they've been quoted, billed and still owe. Built from the
 * lists the app already holds, filtered to this customer.
 */
export function CustomerHistory({ customerId }: { customerId: number }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: quotes } = useQuotes();
  const { data: invoices } = useInvoices();
  const { data: jobs } = useJobs();

  const byDateDesc = (a: any, b: any, key: string) =>
    new Date(b[key] || b.createdAt || 0).getTime() - new Date(a[key] || a.createdAt || 0).getTime();

  const theirQuotes = useMemo(
    () => ((quotes as any[]) || []).filter((q) => q.customerId === customerId).sort((a, b) => byDateDesc(a, b, 'createdAt')),
    [quotes, customerId],
  );
  const theirInvoices = useMemo(
    () => ((invoices as any[]) || []).filter((i) => i.customerId === customerId).sort((a, b) => byDateDesc(a, b, 'createdAt')),
    [invoices, customerId],
  );
  const theirJobs = useMemo(
    () => ((jobs as any[]) || []).filter((j) => j.customerId === customerId).sort((a, b) => byDateDesc(a, b, 'scheduledDate')),
    [jobs, customerId],
  );

  const billed = useMemo(
    () => theirInvoices.filter((i) => i.status !== 'draft').reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0),
    [theirInvoices],
  );
  const { outstanding, received } = useMemo(() => summariseInvoices(theirInvoices), [theirInvoices]);

  if (theirQuotes.length === 0 && theirInvoices.length === 0 && theirJobs.length === 0) {
    return (
      <View style={s.wrap}>
        <Text style={s.eyebrow}>History</Text>
        <View style={[s.card, { padding: 14 }]}>
          <Text style={s.empty}>No quotes, invoices or jobs for this customer yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.eyebrow}>History</Text>
      <View style={s.statsRow}>
        <Stat label="Billed" value={money(billed)} s={s} />
        <Stat label="Paid" value={money(received)} s={s} color={c.green} />
        <Stat label="Owing" value={money(outstanding)} s={s} color={outstanding > 0 ? c.orangeDeep : undefined} />
      </View>

      {theirQuotes.length > 0 ? (
        <Group title={`Quotes · ${theirQuotes.length}`} s={s}>
          {theirQuotes.slice(0, SHOW).map((q, i) => (
            <Row
              key={`q${q.id}`}
              first={i === 0}
              title={quoteTitle(q)}
              sub={[q.status, q.createdAt ? format(new Date(q.createdAt), 'd MMM yyyy') : null].filter(Boolean).join(' · ')}
              amount={money(parseFloat(q.totalAmount) || 0)}
              onPress={() => router.push(`/quotes/${q.id}` as any)}
              s={s}
              c={c}
            />
          ))}
        </Group>
      ) : null}

      {theirInvoices.length > 0 ? (
        <Group title={`Invoices · ${theirInvoices.length}`} s={s}>
          {theirInvoices.slice(0, SHOW).map((inv, i) => {
            const owing = invoiceOwing(inv);
            return (
              <Row
                key={`i${inv.id}`}
                first={i === 0}
                title={inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : `Invoice #${inv.id}`}
                sub={[inv.status, owing > 0 ? `${money(owing)} owing` : null].filter(Boolean).join(' · ')}
                amount={money(parseFloat(inv.totalAmount) || 0)}
                onPress={() => router.push(`/invoices/${inv.id}` as any)}
                s={s}
                c={c}
              />
            );
          })}
        </Group>
      ) : null}

      {theirJobs.length > 0 ? (
        <Group title={`Jobs · ${theirJobs.length}`} s={s}>
          {theirJobs.slice(0, SHOW).map((j, i) => (
            <Row
              key={`j${j.id}`}
              first={i === 0}
              title={j.title}
              sub={[j.status, j.scheduledDate ? format(new Date(j.scheduledDate), 'd MMM yyyy') : null].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/jobs/${j.id}` as any)}
              s={s}
              c={c}
            />
          ))}
        </Group>
      ) : null}
    </View>
  );
}

function Stat({ label, value, s, color }: { label: string; value: string; s: Styles; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Group({ title, children, s }: { title: string; children: React.ReactNode; s: Styles }) {
  return (
    <>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </>
  );
}

function Row({ title, sub, amount, onPress, first, s, c }: {
  title: string; sub?: string; amount?: string; onPress: () => void; first: boolean; s: Styles; c: Colors;
}) {
  return (
    <TouchableOpacity style={[s.row, !first && s.rowBorder]} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={title}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.rowSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {amount ? <Text style={s.rowAmount}>{amount}</Text> : null}
      <ChevronRight size={14} color={c.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

type Styles = ReturnType<typeof makeStyles>;
const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 20 },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft, paddingVertical: 12, paddingHorizontal: 10 },
  statValue: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3 },
  statLabel: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 },
  groupTitle: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi, marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.lineSoft },
  rowTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink },
  rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2, textTransform: 'capitalize' },
  rowAmount: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  empty: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted },
});
