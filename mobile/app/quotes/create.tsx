import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, FileText, Plus, Trash2, Camera, Send } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuote } from '@/hooks/use-quotes';

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

type Mode = 'ai' | 'form';

type LineItem = { name: string; qty: string; price: string };

const QUICK_SUGGESTIONS = [
  'Replace hot water system — Rheem 315L, same location',
  'Fix leaking tap — kitchen mixer, supply new cartridge',
  'Unblock drain — high pressure water jetting',
  'Install new toilet suite — supply and fit Caroma',
];

const DEFAULT_LINES: LineItem[] = [
  { name: '', qty: '1', price: '' },
];

export default function QuoteCreateScreen() {
  const {
    customerName: prefillName,
    customerId: prefillCustomerId,
    quoteId: editIdParam,
  } = useLocalSearchParams<{ customerName?: string; customerId?: string; quoteId?: string }>();

  const editId = editIdParam ? Number(editIdParam) : 0;
  const isEditing = editId > 0;

  const [mode, setMode] = useState<Mode>((prefillName || isEditing) ? 'form' : 'ai');
  const [aiDescription, setAiDescription] = useState('');
  const [descFocused, setDescFocused] = useState(false);
  const [customer, setCustomer]   = useState(prefillName || '');
  const [customerId, setCustomerId] = useState<number | null>(
    prefillName && prefillCustomerId ? Number(prefillCustomerId) : null
  );
  const [jobTitle, setJobTitle]   = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [notes, setNotes]         = useState('');
  const [lines, setLines]         = useState<LineItem[]>(DEFAULT_LINES);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [populated, setPopulated] = useState(false);

  // Fetch existing quote when editing
  const { data: editQuote } = useQuote(editId);

  useEffect(() => {
    if (!editQuote || populated) return;
    let c: any = {};
    try { c = JSON.parse((editQuote as any).content || '{}'); } catch {}
    setJobTitle(c.jobTitle || '');
    setCustomer(c.customerName || '');
    if ((editQuote as any).customerId) setCustomerId((editQuote as any).customerId);
    setSchedDate(c.schedDate || '');
    setNotes(c.notes || '');
    if (c.lines?.length > 0) {
      setLines(c.lines.map((l: any) => ({
        name: l.name || '',
        qty: String(l.qty || 1),
        price: String(l.price || ''),
      })));
    }
    setPopulated(true);
  }, [editQuote]);

  const subtotal = lines.reduce((s, l) => {
    const q = parseFloat(l.qty)  || 0;
    const p = parseFloat(l.price) || 0;
    return s + q * p;
  }, 0);
  const gst   = Math.round(subtotal * 0.1);
  const total = subtotal + gst;

  const addLine = () => setLines(prev => [...prev, { name: '', qty: '1', price: '' }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof LineItem, val: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to attach a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const ext = result.assets[0].mimeType?.split('/')[1] ?? 'jpeg';
      setReceiptBase64(`data:image/${ext};base64,${result.assets[0].base64}`);
      setAiDescription(prev => prev ? prev + '\n[Receipt attached]' : '[Receipt attached]');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      const body = {
        totalAmount: String(total),
        status,
        customerId: customerId ?? undefined,
        content: JSON.stringify({ customerName: customer, jobTitle, schedDate, notes, lines }),
      };
      const res = isEditing
        ? await apiRequest('PATCH', `/api/quotes/${editId}`, body)
        : await apiRequest('POST', '/api/quotes', body);
      if (!res.ok) throw new Error('Failed to save quote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      router.back();
    },
    onError: () => Alert.alert('Could not save', 'Check your connection and try again.'),
  });

  const hasWork = () =>
    aiDescription.trim() || customer.trim() || jobTitle.trim() || schedDate.trim() || notes.trim() ||
    lines.some(l => l.name.trim() || l.qty !== '1' || l.price.trim());

  const handleBack = () => {
    if (hasWork() && !isEditing) {
      Alert.alert('Leave without saving?', 'Your quote details will be lost.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const handleSave = (status: 'draft' | 'sent') => {
    if (!jobTitle.trim()) { setError('Job title is required'); return; }
    if (lines.every(l => !l.price || parseFloat(l.price) <= 0)) {
      setError('Add at least one line item with a price'); return;
    }
    setError(null);
    saveMutation.mutate(status);
  };

  const handleStartWithAI = () => {
    const desc = aiDescription.trim();
    if (desc) {
      router.push(`/ai-chat?description=${encodeURIComponent(desc)}` as any);
    } else {
      router.push('/ai-chat');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Quotes</Text>
            <Text style={s.title}>{isEditing ? 'Edit quote' : 'New quote'}</Text>
          </View>
        </View>

        {/* Mode toggle — hidden in edit mode (always form) */}
        {!isEditing && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
            <View style={s.modeToggle}>
              {([
                { id: 'ai',   label: 'Use AI',    Icon: Sparkles  },
                { id: 'form', label: 'Manual',     Icon: FileText  },
              ] as { id: Mode; label: string; Icon: any }[]).map((t) => {
                const active = mode === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setMode(t.id)}
                    activeOpacity={0.7}
                    style={[s.modeBtn, active && s.modeBtnActive]}
                  >
                    <t.Icon size={14} color={active ? INK : MUTED} strokeWidth={2} />
                    <Text style={[s.modeBtnText, active && s.modeBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {mode === 'ai' ? (
          /* ── AI mode ── */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {/* Hero card */}
            <View style={s.aiHero}>
              <View style={s.aiHeroGlow} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <View style={s.aiAvatar}>
                  <Sparkles size={24} color="#fff" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.aiHeadline}>
                    What are you <Text style={{ color: ORANGE }}>quoting today?</Text>
                  </Text>
                  <Text style={s.aiSubtitle}>Describe the job — I'll price and build it.</Text>
                </View>
              </View>
              {/* Prominent describe input with orange glow on focus/fill */}
              <View style={[s.descInputWrap, (descFocused || aiDescription) ? s.descInputWrapActive : null]}>
                <TextInput
                  style={s.descInput}
                  placeholder="e.g. Replace hot water system at Smiths place, Rheem 315L…"
                  placeholderTextColor={'rgba(255,255,255,0.35)'}
                  value={aiDescription}
                  onChangeText={setAiDescription}
                  onFocus={() => setDescFocused(true)}
                  onBlur={() => setDescFocused(false)}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Quick suggestions */}
            <Text style={s.sectionEyebrow}>Quick suggestions</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {QUICK_SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setAiDescription(sug)}
                  activeOpacity={0.7}
                  style={s.sugRow}
                >
                  <Sparkles size={15} color={ORANGE} strokeWidth={2} />
                  <Text style={s.sugText}>{sug}</Text>
                  <Text style={{ fontSize: 14, color: MUTED }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick actions */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              <TouchableOpacity
                style={[s.quickBtn, { flex: 1, borderColor: receiptBase64 ? ORANGE : LINE_SOFT }]}
                activeOpacity={0.7}
                onPress={handlePickReceipt}
              >
                <Camera size={18} color={receiptBase64 ? ORANGE : INK} strokeWidth={2} />
                <Text style={[s.quickBtnText, receiptBase64 && { color: ORANGE }]}>
                  {receiptBase64 ? 'Receipt attached' : 'Photo / receipt'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.quickBtn, { flex: 1 }]}
                activeOpacity={0.7}
                onPress={() => Alert.alert(
                  'Templates',
                  "Quote templates are coming soon.\n\nYou'll be able to save any quote as a template and reuse it with one tap.",
                  [{ text: 'Got it' }]
                )}
              >
                <FileText size={18} color={INK} strokeWidth={2} />
                <Text style={s.quickBtnText}>From template</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.primaryBtn} activeOpacity={0.8} onPress={handleStartWithAI}>
              <Sparkles size={18} color="#fff" strokeWidth={2} />
              <Text style={s.primaryBtnText}>Start with AI</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ── Form mode ── */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160 }}>

            {/* Live total hero */}
            <View style={s.totalHero}>
              <View style={s.totalHeroGlow} />
              <Text style={s.totalEyebrow}>Running total</Text>
              <Text style={s.totalAmt}>${total.toLocaleString()}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: 'rgba(255,255,255,0.55)' }}>
                  Subtotal <Text style={{ color: 'rgba(255,255,255,0.8)' }}>${subtotal.toLocaleString()}</Text>
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: 'rgba(255,255,255,0.55)' }}>
                  GST <Text style={{ color: 'rgba(255,255,255,0.8)' }}>${gst.toLocaleString()}</Text>
                </Text>
              </View>
            </View>

            {/* Details */}
            <Text style={s.sectionEyebrow}>Details</Text>
            <View style={s.fieldGroup}>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Customer</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="Name or company"
                  placeholderTextColor={MUTED}
                  value={customer}
                  onChangeText={setCustomer}
                  returnKeyType="next"
                />
              </View>
              <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <Text style={s.fieldLabel}>Job title</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="e.g. Hot water swap"
                  placeholderTextColor={MUTED}
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  returnKeyType="next"
                />
              </View>
              <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <Text style={s.fieldLabel}>Date</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="Tue 21 Apr · 9:30 am"
                  placeholderTextColor={MUTED}
                  value={schedDate}
                  onChangeText={setSchedDate}
                  returnKeyType="next"
                />
              </View>
              <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput
                  style={[s.fieldInput, { flex: 1 }]}
                  placeholder="Visible to customer…"
                  placeholderTextColor={MUTED}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Line items */}
            <Text style={s.sectionEyebrow}>Line items</Text>
            <View style={[s.fieldGroup, { padding: 0 }]}>
              {lines.map((item, i) => (
                <View
                  key={i}
                  style={[s.lineItemRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
                >
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={s.lineNameInput}
                      placeholder="Item description"
                      placeholderTextColor={MUTED}
                      value={item.name}
                      onChangeText={(v) => updateLine(i, 'name', v)}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.lineMetaLabel}>Qty</Text>
                        <TextInput
                          style={s.lineMetaInput}
                          value={item.qty}
                          onChangeText={(v) => updateLine(i, 'qty', v)}
                          keyboardType="numeric"
                          selectTextOnFocus
                        />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.lineMetaLabel}>$</Text>
                        <TextInput
                          style={s.lineMetaInput}
                          value={item.price}
                          onChangeText={(v) => updateLine(i, 'price', v)}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={MUTED}
                          selectTextOnFocus
                        />
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={s.lineTotal}>
                          ${((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeLine(i)}
                    activeOpacity={0.7}
                    style={s.removeBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Trash2 size={14} color={MUTED} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addLineBtn} activeOpacity={0.7} onPress={addLine}>
                <Plus size={16} color={ORANGE_DEEP} strokeWidth={2.5} />
                <Text style={s.addLineBtnText}>Add line item</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Bottom CTAs — form mode only */}
        {mode === 'form' && (
          <View style={s.bottomBar}>
            {error ? (
              <View style={{ backgroundColor: '#fde5e5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: '#d23b3b' }}>{error}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={s.secondaryBtn}
                activeOpacity={0.7}
                onPress={() => handleSave('draft')}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.secondaryBtnText}>Save draft</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { flex: 2 }]}
                activeOpacity={0.8}
                onPress={() => handleSave('sent')}
                disabled={saveMutation.isPending}
              >
                <Send size={16} color="#fff" strokeWidth={2} />
                <Text style={s.primaryBtnText}>Send to customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: PAPER_DEEP,
    borderRadius: 14,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: CARD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
  },
  modeBtnTextActive: {
    color: INK,
  },

  /* AI mode */
  aiHero: {
    backgroundColor: BLACK,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  aiHeroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${ORANGE}88`,
    opacity: 0.5,
  },
  aiAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  aiHeadline: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 22,
    marginBottom: 4,
  },
  aiSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
  },
  descInputWrap: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  descInputWrapActive: {
    borderColor: ORANGE,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  descInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: '#fff',
    minHeight: 140,
  },
  sugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  sugText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  quickBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },

  /* Form mode */
  totalHero: {
    backgroundColor: BLACK,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  totalHeroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${ORANGE}88`,
    opacity: 0.35,
  },
  totalEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalAmt: {
    fontSize: 40,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fieldGroup: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
    width: 72,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    paddingVertical: 2,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  lineNameInput: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    paddingVertical: 0,
  },
  lineMetaLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
  lineMetaInput: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    minWidth: 44,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: LINE_MID,
  },
  lineTotal: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: LINE_MID,
  },
  addLineBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingBottom: 34,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(247,244,238,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 30,
  },
  primaryBtn: {
    height: 60,
    borderRadius: 20,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  secondaryBtn: {
    flex: 1,
    height: 60,
    borderRadius: 20,
    backgroundColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
