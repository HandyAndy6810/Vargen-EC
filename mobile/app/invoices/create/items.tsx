import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Plus, Trash2, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { makeInvoiceStyles } from '@/lib/invoice-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

const STEPS = ['Customer', 'Job', 'Items', 'Review'] as const;

export default function ItemsStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeInvoiceStyles(c), [c]);
  const d = useInvoiceDraft();

  const canNext = d.standaloneTotal > 0;

  return (
    <QuoteStepScaffold
      flowLabel="New invoice"
      steps={STEPS}
      stepIndex={2}
      title="Line items"
      footerLabel="Review invoice"
      onNext={() => router.push('/invoices/create/review')}
      nextDisabled={!canNext}
    >
      <Text style={s.sectionEyebrow}>Line items</Text>
      <View style={[s.card, { padding: 0 }]}>
        <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ flex: 3, fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>Item</Text>
            <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>Qty</Text>
            <Text style={{ flex: 2, fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>Unit $</Text>
          </View>
        </View>
        {d.lines.map((line, i) => (
          <View key={i} style={[s.lineEditRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <TextInput style={s.lineInput} placeholder="Description" placeholderTextColor={c.muted} value={line.description} onChangeText={v => d.updateLine(i, 'description', v)} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[s.lineInput, { flex: 1 }]} placeholder="Qty" placeholderTextColor={c.muted} value={line.qty} onChangeText={v => d.updateLine(i, 'qty', v)} keyboardType="decimal-pad" />
                <TextInput style={[s.lineInput, { flex: 2 }]} placeholder="Unit price" placeholderTextColor={c.muted} value={line.unitPrice} onChangeText={v => d.updateLine(i, 'unitPrice', v)} keyboardType="decimal-pad" />
                <View style={s.lineTotal}>
                  <Text style={s.lineTotalText}>${((parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0)).toLocaleString()}</Text>
                </View>
              </View>
            </View>
            {d.lines.length > 1 && (
              <TouchableOpacity style={s.removeBtn} onPress={() => d.removeLine(i)} activeOpacity={0.7}>
                <Trash2 size={15} color={c.muted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={s.addLineBtn} activeOpacity={0.7} onPress={d.addLine}>
          <Plus size={16} color={c.orangeDeep} strokeWidth={2.5} />
          <Text style={s.addLineBtnText}>Add line item</Text>
        </TouchableOpacity>
      </View>

      {/* AI suggestions from the job title */}
      {d.loadingSuggestions && (
        <View style={s.suggestionsLoading}>
          <ActivityIndicator size="small" color={c.orange} />
          <Text style={s.suggestionsLoadingText}>AI is generating line item suggestions…</Text>
        </View>
      )}
      {!d.loadingSuggestions && d.aiSuggestions.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <View style={s.suggestionsHeader}>
            <Sparkles size={13} color={c.orange} strokeWidth={2} />
            <Text style={s.suggestionsTitle}>AI suggestions — tap to add</Text>
          </View>
          <View style={s.suggestionsCard}>
            {d.aiSuggestions.map((sug, i) => (
              <TouchableOpacity key={i} activeOpacity={0.7} style={[s.suggestionRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]} onPress={() => d.addSuggestion(sug)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.suggestionDesc}>{sug.description}</Text>
                  <Text style={s.suggestionMeta}>Qty {sug.quantity} · ${sug.unitPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={s.suggestionAddBtn}><Plus size={12} color={c.orangeDeep} strokeWidth={2.5} /></View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={s.totalBand}>
        <View>
          <Text style={s.totalBandLabel}>Total · inc GST</Text>
          <Text style={s.totalBandSub}>${d.standaloneTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })} + ${d.standaloneGST.toLocaleString('en-AU', { minimumFractionDigits: 2 })} GST</Text>
        </View>
        <Text style={s.totalBandAmount}>${d.standaloneFinal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      </View>
      {d.labourTotal > 0 ? <Text style={[s.typeHint, { marginTop: 8 }]}>A labour line (${d.labourTotal.toFixed(2)}) will be added automatically.</Text> : null}
    </QuoteStepScaffold>
  );
}
