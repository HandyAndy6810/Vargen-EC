import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Sparkles, Send } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { makeInvoiceStyles } from '@/lib/invoice-step-styles';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

export default function FromQuoteStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeInvoiceStyles(c), [c]);
  const f = useMemo(() => footerStyles(c), [c]);
  const d = useInvoiceDraft();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={f.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={f.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={f.eyebrow}>New invoice</Text>
            <Text style={f.title}>From quote</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          {d.error ? <View style={s.errorBox}><Text style={s.errorText}>{d.error}</Text></View> : null}

          {d.quoteLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}><ActivityIndicator color={c.orange} /></View>
          ) : (
            <>
              <View style={s.prefillCard}>
                <View style={s.prefillIcon}><Sparkles size={20} color="#fff" strokeWidth={2} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.prefillEyebrow}>Converting from quote</Text>
                  <Text style={s.prefillTitle} numberOfLines={1}>{d.quoteTitle}</Text>
                  <Text style={s.prefillSub}>
                    {d.quoteCustomer ? `${d.quoteCustomer} · ` : ''}
                    {d.quoteItemCount > 0 ? `${d.quoteItemCount} items · ` : ''}
                    ${d.quoteTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <Text style={s.sectionEyebrow}>Invoice for</Text>
              <View style={s.typeRow}>
                {([
                  { key: 'full', label: 'Full amount' },
                  { key: 'deposit', label: 'Deposit' },
                  { key: 'balance', label: 'Balance' },
                ] as const).map(t => {
                  const active = d.invoiceType === t.key;
                  const disabled = t.key === 'full' && d.priorInvoiced > 0;
                  return (
                    <TouchableOpacity key={t.key} onPress={() => d.setInvoiceType(t.key)} disabled={disabled} activeOpacity={0.8}
                      style={[s.typeChip, active && s.typeChipActive, disabled && { opacity: 0.35 }]}>
                      <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {d.invoiceType === 'deposit' && (
                <>
                  <View style={[s.typeRow, { marginTop: 8 }]}>
                    {[10, 20, 25, 50].map(p => (
                      <TouchableOpacity key={p} onPress={() => d.setDepositPercent(p)} activeOpacity={0.8}
                        style={[s.typeChip, d.depositPercent === p && s.typeChipActive]}>
                        <Text style={[s.typeChipText, d.depositPercent === p && s.typeChipTextActive]}>{p}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={s.typeHint}>
                    {`Deposit now: $${(d.quoteTotal * d.depositPercent / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    {`  ·  Balance later: $${(d.quoteTotal - d.priorInvoiced - d.quoteTotal * d.depositPercent / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </Text>
                </>
              )}

              {d.priorInvoiced > 0 && (
                <Text style={s.typeHint}>
                  {`Already invoiced on this quote: $${d.priorInvoiced.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of $${d.quoteTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </Text>
              )}

              <Text style={s.sectionEyebrow}>What happens</Text>
              <View style={s.infoCard}>
                {[
                  'Line items copied from the quote',
                  'Invoice number auto-generated',
                  `Due date: ${d.dueDateStr} (${d.paymentTermsDays}-day terms)`,
                  d.invoiceType === 'full' ? 'Quote marked "Invoiced"' : 'Quote stays open until fully invoiced',
                ].map((item, i) => (
                  <View key={i} style={[s.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                    <Text style={s.infoDot}>✓</Text>
                    <Text style={s.infoText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View style={f.footer}>
          <TouchableOpacity style={[f.createBtn, (d.saving || d.quoteLoading) && { opacity: 0.6 }]} activeOpacity={0.85} onPress={d.handleConvert} disabled={d.saving || d.quoteLoading}>
            {d.saving ? <ActivityIndicator color="#fff" /> : <><Send size={16} color="#fff" strokeWidth={2} /><Text style={f.createText}>Create invoice</Text></>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const footerStyles = (c: Colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5, marginTop: 2 },
  footer: {
    paddingTop: 12, paddingBottom: 34, paddingHorizontal: 16, backgroundColor: c.paper,
    borderTopWidth: 1, borderTopColor: c.lineSoft, shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 12,
  },
  createBtn: {
    height: 58, borderRadius: 18, backgroundColor: c.orange, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  createText: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
