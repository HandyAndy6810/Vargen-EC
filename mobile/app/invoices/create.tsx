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
import { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Send, Plus, Trash2 } from 'lucide-react-native';
import { useQuote } from '@/hooks/use-quotes';
import { useCreateInvoice, useConvertQuoteToInvoice } from '@/hooks/use-invoices';
import * as Haptics from 'expo-haptics';
import { apiRequest } from '@/lib/api';

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

interface AiSuggestion {
  description: string;
  quantity: number;
  unitPrice: number;
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
  const [jobTitle, setJobTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [labourRate, setLabourRate] = useState('');
  const [labourHours, setLabourHours] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    { description: '', qty: '1', unitPrice: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestedForTitle, setSuggestedForTitle] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convertMutation = useConvertQuoteToInvoice();
  const createMutation = useCreateInvoice();

  // Labour line value
  const labourTotal = (parseFloat(labourRate) || 0) * (parseFloat(labourHours) || 0);

  // Live total for standalone form (line items + labour)
  const lineItemsTotal = lines.reduce((s, l) => {
    const q = parseFloat(l.qty) || 0;
    const p = parseFloat(l.unitPrice) || 0;
    return s + q * p;
  }, 0);
  const standaloneTotal = lineItemsTotal + labourTotal;
  const standaloneGST = Math.round(standaloneTotal * 0.1 * 100) / 100;
  const standaloneFinal = standaloneTotal + standaloneGST;

  const addLine = () => setLines(prev => [...prev, { description: '', qty: '1', unitPrice: '' }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const fetchAiSuggestions = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 3 || trimmed === suggestedForTitle) return;
    setSuggestedForTitle(trimmed);
    setLoadingSuggestions(true);
    setAiSuggestions([]);
    try {
      const res = await apiRequest('POST', '/api/quotes/generate', {
        description: trimmed,
        labourRate: labourRate ? parseFloat(labourRate) : undefined,
        includeGST: true,
      });
      if (res.ok) {
        const data = await res.json();
        const items: AiSuggestion[] = (data.items || []).map((it: any) => ({
          description: it.description,
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
        }));
        setAiSuggestions(items);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Silent — suggestions are non-critical
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const onJobTitleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAiSuggestions(jobTitle), 300);
  };

  const addSuggestion = (sug: AiSuggestion) => {
    Haptics.selectionAsync();
    // Replace the first empty line or append
    setLines(prev => {
      const emptyIdx = prev.findIndex(l => !l.description.trim() && !l.unitPrice.trim());
      const newLine = { description: sug.description, qty: String(sug.quantity), unitPrice: String(sug.unitPrice) };
      if (emptyIdx !== -1) {
        return prev.map((l, i) => i === emptyIdx ? newLine : l);
      }
      return [...prev, newLine];
    });
    // Remove from suggestions
    setAiSuggestions(prev => prev.filter(s => s.description !== sug.description));
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
    // Auto-add labour line if filled
    if (labourTotal > 0) {
      validLines.push({
        description: `Labour${labourHours ? ` — ${labourHours} hrs` : ''}`,
        qty: labourHours || '1',
        unitPrice: labourRate || '0',
      });
    }
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
      notes: [jobTitle.trim() ? `Job: ${jobTitle.trim()}` : '', notes.trim()].filter(Boolean).join('\n') || undefined,
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >

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
              {/* Job title — triggers AI suggestions on blur */}
              <Text style={s.sectionEyebrow}>Job title</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Bathroom renovation — supply & install"
                placeholderTextColor={MUTED}
                value={jobTitle}
                onChangeText={v => { setJobTitle(v); setSuggestedForTitle(''); }}
                onBlur={onJobTitleBlur}
                returnKeyType="next"
              />

              <Text style={s.sectionEyebrow}>Customer</Text>
              <TextInput
                style={s.input}
                placeholder="Customer name (optional)"
                placeholderTextColor={MUTED}
                value={customerName}
                onChangeText={setCustomerName}
                returnKeyType="next"
              />

              {/* Labour */}
              <Text style={s.sectionEyebrow}>Labour</Text>
              <View style={s.card}>
                <View style={s.labourRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.labourLabel}>Rate</Text>
                    <View style={s.labourInputWrap}>
                      <Text style={s.labourUnit}>$/hr</Text>
                      <TextInput
                        style={s.labourInput}
                        value={labourRate}
                        onChangeText={setLabourRate}
                        placeholder="0"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                  <View style={s.labourDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.labourLabel}>Hours</Text>
                    <View style={s.labourInputWrap}>
                      <Text style={s.labourUnit}>hrs</Text>
                      <TextInput
                        style={s.labourInput}
                        value={labourHours}
                        onChangeText={setLabourHours}
                        placeholder="0"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                  <View style={s.labourDivider} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.labourLabel}>Total</Text>
                    <Text style={s.labourTotal}>
                      ${labourTotal > 0 ? labourTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </Text>
                  </View>
                </View>
              </View>

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
                <TouchableOpacity style={s.addLineBtn} onPress={addLine} activeOpacity={0.7}>
                  <Plus size={14} color={ORANGE_DEEP} strokeWidth={2.5} />
                  <Text style={s.addLineBtnText}>Add line item</Text>
                </TouchableOpacity>
              </View>

              {/* AI suggestions */}
              {loadingSuggestions && (
                <View style={s.suggestionsLoading}>
                  <ActivityIndicator size="small" color={ORANGE} />
                  <Text style={s.suggestionsLoadingText}>AI is generating line item suggestions…</Text>
                </View>
              )}
              {!loadingSuggestions && aiSuggestions.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={s.suggestionsHeader}>
                    <Sparkles size={13} color={ORANGE} strokeWidth={2} />
                    <Text style={s.suggestionsTitle}>AI suggestions — tap to add</Text>
                  </View>
                  <View style={s.suggestionsCard}>
                    {aiSuggestions.map((sug, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.7}
                        style={[s.suggestionRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
                        onPress={() => addSuggestion(sug)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.suggestionDesc}>{sug.description}</Text>
                          <Text style={s.suggestionMeta}>
                            Qty {sug.quantity} · ${sug.unitPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                        <View style={s.suggestionAddBtn}>
                          <Plus size={12} color={ORANGE_DEEP} strokeWidth={2.5} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

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
                onPress={() => handleCreateStandalone('sent')}
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
  labourRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 16,
  },
  labourDivider: {
    width: 1,
    backgroundColor: LINE_SOFT,
    marginVertical: 4,
  },
  labourLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  labourInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  labourUnit: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  labourInput: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    textAlign: 'center',
    minWidth: 50,
  },
  labourTotal: {
    fontSize: 17,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    marginTop: 2,
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
  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  suggestionsLoadingText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  suggestionsCard: {
    backgroundColor: ORANGE_SOFT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242,106,42,0.2)',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionDesc: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED_HI,
  },
  suggestionAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: 'rgba(242,106,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: LINE_SOFT,
    backgroundColor: PAPER,
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
