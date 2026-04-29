import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Send, Plus, Trash2 } from 'lucide-react-native';
import { useQuote } from '@/hooks/use-quotes';
import { useCreateInvoice, useConvertQuoteToInvoice } from '@/hooks/use-invoices';
import * as Haptics from 'expo-haptics';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';
const RED_SOFT    = '#fde5e5';
const RED         = '#d23b3b';

interface LineItem {
  description: string;
  qty: string;
  unitPrice: string;
}

export default function InvoiceCreateScreen() {
  const { quoteId } = useLocalSearchParams<{ quoteId?: string }>();
  const quoteIdNum = quoteId ? Number(quoteId) : 0;
  const isFromQuote = !!quoteIdNum;

  // Fetch quote if converting
  const { data: quote, isLoading: quoteLoading } = useQuote(quoteIdNum) as any;

  // Parse quote content for preview
  let quoteContent: any = {};
  try { quoteContent = JSON.parse(quote?.content || '{}'); } catch {}
  const quoteTitle = quoteContent.jobTitle || `Quote #${quoteId}`;
  const quoteCustomer = quoteContent.customerName || '';
  const quoteItemCount = quoteContent.items?.length || quoteContent.lines?.length || 0;
  const quoteTotal = quote?.totalAmount ? parseFloat(quote.totalAmount) : 0;

  // Standalone form state
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    { description: '', qty: '1', unitPrice: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const convertMutation = useConvertQuoteToInvoice();
  const createMutation = useCreateInvoice();

  // Live total for standalone form
  const standaloneTotal = lines.reduce((s, l) => {
    const q = parseFloat(l.qty) || 0;
    const p = parseFloat(l.unitPrice) || 0;
    return s + q * p;
  }, 0);
  const standaloneGST = Math.round(standaloneTotal * 0.1 * 100) / 100;
  const standaloneFinal = standaloneTotal + standaloneGST;

  const addLine = () => setLines(prev => [...prev, { description: '', qty: '1', unitPrice: '' }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const handleConvertFromQuote = () => {
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    convertMutation.mutate(quoteIdNum, {
      onSuccess: (invoice: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/invoices/${invoice.id}` as any);
      },
      onError: (err: any) => setError(err.message),
    });
  };

  const handleCreateStandalone = (status: 'draft' | 'sent') => {
    const validLines = lines.filter(l => l.description.trim() && parseFloat(l.unitPrice) > 0);
    if (validLines.length === 0) {
      setError('Add at least one line item with a description and price.');
      return;
    }
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate({
      customerName: customerName.trim() || undefined,
      items: validLines.map(l => ({
        description: l.description.trim(),
        quantity: parseFloat(l.qty) || 1,
        unit: 'each',
        unitPrice: parseFloat(l.unitPrice) || 0,
      })),
      notes: notes.trim() || undefined,
      includeGST: true,
    }, {
      onSuccess: (invoice: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/invoices/${invoice.id}` as any);
      },
      onError: (err: any) => setError(err.message),
    });
  };

  const isPending = convertMutation.isPending || createMutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>{isFromQuote ? 'Convert quote' : 'New invoice'}</Text>
            <Text style={s.title}>{isFromQuote ? 'Turn quote into invoice' : 'Turn a job into cash'}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160 }}>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── FROM QUOTE FLOW ── */}
          {isFromQuote && (
            <>
              {quoteLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <ActivityIndicator color={ORANGE} />
                </View>
              ) : (
                <>
                  {/* Pre-fill card */}
                  <View style={s.prefillCard}>
                    <View style={s.prefillIcon}>
                      <Sparkles size={20} color="#fff" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.prefillEyebrow}>Converting from quote</Text>
                      <Text style={s.prefillTitle} numberOfLines={1}>{quoteTitle}</Text>
                      <Text style={s.prefillSub}>
                        {quoteCustomer ? `${quoteCustomer} · ` : ''}
                        {quoteItemCount > 0 ? `${quoteItemCount} items · ` : ''}
                        ${quoteTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.sectionEyebrow}>What happens</Text>
                  <View style={s.infoCard}>
                    {[
                      'All line items copied from the quote',
                      'Invoice number auto-generated',
                      'Due date set to your payment terms (14 days)',
                      'Quote status updated to "Invoiced"',
                    ].map((item, i) => (
                      <View key={i} style={[s.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                        <Text style={s.infoDot}>✓</Text>
                        <Text style={s.infoText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* ── STANDALONE FLOW ── */}
          {!isFromQuote && (
            <>
              <Text style={s.sectionEyebrow}>Customer</Text>
              <TextInput
                style={s.input}
                placeholder="Customer name (optional)"
                placeholderTextColor={MUTED}
                value={customerName}
                onChangeText={setCustomerName}
                returnKeyType="next"
              />

              <Text style={s.sectionEyebrow}>Line items</Text>
              <View style={[s.card, { padding: 0 }]}>
                {lines.map((line, i) => (
                  <View key={i} style={[s.lineEditRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        style={s.lineInput}
                        placeholder="Description"
                        placeholderTextColor={MUTED}
                        value={line.description}
                        onChangeText={v => updateLine(i, 'description', v)}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[s.lineInput, { flex: 1 }]}
                          placeholder="Qty"
                          placeholderTextColor={MUTED}
                          value={line.qty}
                          onChangeText={v => updateLine(i, 'qty', v)}
                          keyboardType="decimal-pad"
                        />
                        <TextInput
                          style={[s.lineInput, { flex: 2 }]}
                          placeholder="Unit price"
                          placeholderTextColor={MUTED}
                          value={line.unitPrice}
                          onChangeText={v => updateLine(i, 'unitPrice', v)}
                          keyboardType="decimal-pad"
                        />
                        <View style={s.lineTotal}>
                          <Text style={s.lineTotalText}>
                            ${((parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {lines.length > 1 ? (
                      <TouchableOpacity onPress={() => removeLine(i)} style={s.removeBtn} activeOpacity={0.7}>
                        <Trash2 size={14} color={MUTED} strokeWidth={2} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
                <TouchableOpacity
                  style={s.addLineBtn}
                  onPress={addLine}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={ORANGE_DEEP} strokeWidth={2.5} />
                  <Text style={s.addLineBtnText}>Add line item</Text>
                </TouchableOpacity>
              </View>

              {/* Live total */}
              <View style={s.totalBand}>
                <View>
                  <Text style={s.totalBandLabel}>Total · inc GST</Text>
                  <Text style={s.totalBandSub}>
                    ${standaloneTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })} + ${standaloneGST.toLocaleString('en-AU', { minimumFractionDigits: 2 })} GST
                  </Text>
                </View>
                <Text style={s.totalBandAmount}>
                  ${standaloneFinal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              <Text style={s.sectionEyebrow}>Notes (optional)</Text>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }]}
                placeholder="Payment terms, job details, etc."
                placeholderTextColor={MUTED}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </>
          )}
        </ScrollView>

        {/* Bottom CTAs */}
        <View style={s.bottomBar}>
          {isFromQuote ? (
            <TouchableOpacity
              style={[s.sendBtn, isPending && { opacity: 0.6 }]}
              activeOpacity={0.8}
              onPress={handleConvertFromQuote}
              disabled={isPending || quoteLoading}
            >
              {isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Send size={16} color="#fff" strokeWidth={2} />
                    <Text style={s.sendBtnText}>Create invoice ›</Text>
                  </>}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[s.draftBtn, isPending && { opacity: 0.6 }]}
                activeOpacity={0.7}
                onPress={() => handleCreateStandalone('draft')}
                disabled={isPending}
              >
                <Text style={s.draftBtnText}>Save draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, isPending && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={() => handleCreateStandalone('draft')}
                disabled={isPending}
              >
                {isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Send size={16} color="#fff" strokeWidth={2} />
                      <Text style={s.sendBtnText}>Create invoice</Text>
                    </>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: RED_SOFT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: RED,
  },
  prefillCard: {
    backgroundColor: ORANGE_SOFT,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,106,42,0.3)',
    marginTop: 4,
  },
  prefillIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefillEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  prefillTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    marginTop: 2,
  },
  prefillSub: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: ORANGE_DEEP,
    marginTop: 1,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  infoDot: {
    fontSize: 13,
    color: ORANGE,
    fontFamily: 'Manrope_800ExtraBold',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: INK,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  lineEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
  },
  lineInput: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: INK,
  },
  lineTotal: {
    flex: 1,
    height: 40,
    backgroundColor: PAPER_DEEP,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  lineTotalText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: LINE_SOFT,
  },
  addLineBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
  },
  totalBand: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: BLACK,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBandLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  totalBandSub: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  totalBandAmount: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    letterSpacing: -1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  draftBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  sendBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  sendBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
