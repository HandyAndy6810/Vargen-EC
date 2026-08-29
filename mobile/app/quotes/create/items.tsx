import { useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Platform, KeyboardAvoidingView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Plus, Trash2, Sparkles } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { makeQuoteStyles } from '@/lib/quote-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useQuoteDraft } from '@/hooks/use-quote-draft';
import { showConfirm } from '@/lib/dialogs';

export default function ItemsStep() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeQuoteStyles(c, isDark), [c, isDark]);
  const x = useMemo(() => extraStyles(c), [c]);
  const d = useQuoteDraft();

  const hasPricedLine = d.lines.some(l => (parseFloat(l.price) || 0) > 0 && l.name.trim());
  const editLineTotal = (parseFloat(d.editLineDraft.qty) || 0) * (parseFloat(d.editLineDraft.price) || 0);

  return (
    <>
      <QuoteStepScaffold
        stepIndex={2}
        title="Line items"
        footerLabel="Review quote"
        onNext={() => router.push('/quotes/create/review')}
        nextDisabled={!hasPricedLine}
      >
        {/* AI assist — build the items without leaving the manual flow */}
        <TouchableOpacity style={x.aiBtn} activeOpacity={0.85} onPress={d.generateItemsWithAI} disabled={d.aiBusy}>
          {d.aiBusy
            ? <ActivityIndicator color={c.orange} size="small" />
            : <><Sparkles size={17} color={c.orange} strokeWidth={2.2} /><Text style={x.aiBtnText}>AI: build these from the job</Text></>}
        </TouchableOpacity>

        <Text style={[s.sectionEyebrow, { marginTop: 18 }]}>Items</Text>
        <View style={[s.fieldGroup, { padding: 0 }]}>
          {d.lines.map((item, i) => {
            const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => d.openLineEdit(i)}
                style={[s.lineItemRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.lineNameText, !item.name && { color: c.muted }]} numberOfLines={1}>
                    {item.name || 'Tap to describe item…'}
                  </Text>
                  <Text style={s.lineMetaText}>{item.qty || 1} × ${item.price || '0'}</Text>
                </View>
                <Text style={s.lineTotalText}>${lineTotal.toLocaleString()}</Text>
                <ChevronRight size={16} color={c.muted} strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={s.addLineBtn} activeOpacity={0.7} onPress={d.addLine}>
            <Plus size={16} color={c.orangeDeep} strokeWidth={2.5} />
            <Text style={s.addLineBtnText}>Add line item</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.totalHero, { marginTop: 4 }]}>
          <View style={s.totalHeroGlow} />
          <Text style={s.totalEyebrow}>Quote total</Text>
          <Text style={s.totalAmt}>${d.total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={s.totalSub}>${d.subtotal.toFixed(2)} + ${d.gst.toFixed(2)} GST</Text>
        </View>
      </QuoteStepScaffold>

      {/* ── Line item edit modal ── */}
      <Modal
        visible={d.editLineIdx !== null}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        onRequestClose={d.closeLineEdit}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={d.closeLineEdit} style={s.modalCancelBtn}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <Text style={s.modalTitle}>Line item</Text>
              <TouchableOpacity onPress={d.saveLineEdit} style={s.modalDoneBtn}><Text style={s.modalDoneText}>Done</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text style={s.modalLabel}>Description</Text>
              <View style={s.modalInputWrap}>
                <TextInput
                  style={s.modalTextArea}
                  placeholder="What does this item cover?"
                  placeholderTextColor={c.muted}
                  value={d.editLineDraft.name}
                  onChangeText={v => d.setEditLineDraft(dr => ({ ...dr, name: v }))}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>Quantity</Text>
                  <View style={s.modalInputWrap}>
                    <TextInput style={s.modalInput} value={d.editLineDraft.qty} onChangeText={v => d.setEditLineDraft(dr => ({ ...dr, qty: v }))} keyboardType="numeric" selectTextOnFocus placeholder="1" placeholderTextColor={c.muted} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>Unit price ($)</Text>
                  <View style={s.modalInputWrap}>
                    <TextInput style={s.modalInput} value={d.editLineDraft.price} onChangeText={v => d.setEditLineDraft(dr => ({ ...dr, price: v }))} keyboardType="numeric" selectTextOnFocus placeholder="0" placeholderTextColor={c.muted} />
                  </View>
                </View>
              </View>
              <View style={s.modalTotalCard}>
                <Text style={s.modalTotalLabel}>Item total</Text>
                <Text style={s.modalTotalAmt}>${editLineTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              {d.lines.length > 1 && (
                <TouchableOpacity
                  style={s.deleteLineBtn}
                  activeOpacity={0.7}
                  onPress={() => showConfirm({ title: 'Remove item?', confirmLabel: 'Remove', destructive: true, onConfirm: d.deleteLineFromModal })}
                >
                  <Trash2 size={16} color="#d23b3b" strokeWidth={2} />
                  <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#d23b3b' }}>Remove item</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const extraStyles = (c: Colors) => StyleSheet.create({
  aiBtn: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 14, backgroundColor: c.orangeSoft, borderWidth: 1, borderColor: `${c.orange}55`,
  },
  aiBtnText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep },
});
