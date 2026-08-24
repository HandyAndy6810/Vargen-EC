import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { User, Briefcase, ListChecks, ChevronRight, Send } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { makeInvoiceStyles } from '@/lib/invoice-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

const STEPS = ['Customer', 'Job', 'Items', 'Review'] as const;

export default function InvoiceReviewStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeInvoiceStyles(c), [c]);
  const x = useMemo(() => reviewStyles(c), [c]);
  const d = useInvoiceDraft();

  const go = (path: string) => router.push(path as any);
  const pricedLines = d.lines.filter(l => (parseFloat(l.unitPrice) || 0) > 0 || l.description.trim());

  const footer = (
    <View style={{ gap: 10 }}>
      {d.error ? <View style={s.errorBox}><Text style={s.errorText}>{d.error}</Text></View> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={x.draftBtn} activeOpacity={0.8} onPress={() => d.handleCreateStandalone('draft')} disabled={d.saving}>
          {d.saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={x.draftBtnText}>Save draft</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={x.sendBtn} activeOpacity={0.85} onPress={() => d.handleCreateStandalone('sent')} disabled={d.saving}>
          <Send size={16} color="#fff" strokeWidth={2} />
          <Text style={x.sendBtnText}>Save &amp; send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <QuoteStepScaffold flowLabel="New invoice" steps={STEPS} stepIndex={3} title="Review invoice" footer={footer}>
      <View style={s.totalBand}>
        <View>
          <Text style={s.totalBandLabel}>Total · inc GST</Text>
          <Text style={s.totalBandSub}>${d.standaloneTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })} + ${d.standaloneGST.toLocaleString('en-AU', { minimumFractionDigits: 2 })} GST</Text>
        </View>
        <Text style={s.totalBandAmount}>${d.standaloneFinal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      </View>

      <TouchableOpacity style={x.card} activeOpacity={0.7} onPress={() => go('/invoices/create/customer')}>
        <View style={[x.icon, { backgroundColor: c.greenSoft }]}><User size={17} color={c.green} strokeWidth={2.2} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={x.label}>Customer</Text>
          <Text style={x.value} numberOfLines={1}>{d.customerName.trim() || 'Not set'}</Text>
        </View>
        <ChevronRight size={16} color={c.muted} strokeWidth={2} />
      </TouchableOpacity>

      <TouchableOpacity style={x.card} activeOpacity={0.7} onPress={() => go('/invoices/create/job')}>
        <View style={[x.icon, { backgroundColor: c.blueSoft }]}><Briefcase size={17} color={c.blue} strokeWidth={2.2} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={x.label}>Job</Text>
          <Text style={x.value} numberOfLines={1}>{d.jobTitle.trim() || 'Untitled'}</Text>
          {d.labourTotal > 0 ? <Text style={x.meta}>Labour ${d.labourTotal.toFixed(2)}</Text> : null}
        </View>
        <ChevronRight size={16} color={c.muted} strokeWidth={2} />
      </TouchableOpacity>

      <TouchableOpacity style={[x.card, { alignItems: 'flex-start' }]} activeOpacity={0.7} onPress={() => go('/invoices/create/items')}>
        <View style={[x.icon, { backgroundColor: c.orangeSoft }]}><ListChecks size={17} color={c.orange} strokeWidth={2.2} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={x.label}>Line items · {pricedLines.length}</Text>
          {pricedLines.slice(0, 4).map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 10 }}>
              <Text style={x.itemName} numberOfLines={1}>{l.description || 'Item'}</Text>
              <Text style={x.itemAmt}>${((parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0)).toLocaleString()}</Text>
            </View>
          ))}
          {pricedLines.length > 4 ? <Text style={x.meta}>+{pricedLines.length - 4} more</Text> : null}
        </View>
        <ChevronRight size={16} color={c.muted} strokeWidth={2} />
      </TouchableOpacity>
    </QuoteStepScaffold>
  );
}

const reviewStyles = (c: Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, paddingHorizontal: 14, paddingVertical: 13,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.4, textTransform: 'uppercase' },
  value: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 2, letterSpacing: -0.2 },
  meta: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 3 },
  itemName: { flex: 1, fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.ink },
  itemAmt: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink },
  draftBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  draftBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  sendBtn: {
    flex: 2, height: 56, borderRadius: 18, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  sendBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
