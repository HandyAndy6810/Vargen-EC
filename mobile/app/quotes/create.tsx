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
  Modal,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { format, addDays } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { ChevronLeft, ChevronRight, Sparkles, FileText, Plus, Trash2, Camera, Send, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuote } from '@/hooks/use-quotes';
import { useSettings } from '@/hooks/use-settings';
import { MarginSlider } from '@/components/MarginSlider';
import { useCustomers } from '@/hooks/use-customers';

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

// ── Trade-specific quick suggestions ─────────────────────────────────────────
const TRADE_SUGGESTIONS: Record<string, string[]> = {
  plumbing: [
    'Replace hot water system — Rheem 315L, same location',
    'Fix leaking tap — kitchen mixer, supply new cartridge',
    'Unblock drain — high pressure water jetting',
    'Install new toilet suite — supply and fit Caroma',
  ],
  electrical: [
    'Install 4x double powerpoints — kitchen renovation',
    'Replace switchboard — upgrade to RCD protected',
    'Install LED downlights — 10x living/dining areas',
    'Fault find and repair — no power to kitchen circuit',
  ],
  carpentry: [
    'Supply and install hardwood decking — 40m² backyard',
    'Build garden shed — 3m × 3m, Colorbond roof',
    'Replace rotted fascia and soffit — front of house',
    'Install 6 internal doors with frames and hardware',
  ],
  painting: [
    'Interior repaint — 4 bedroom home, walls and ceilings',
    'Exterior house repaint — 2 coats, prep and prime',
    'Render and paint feature wall — living room 4m × 3m',
    'Paint fence — 40m timber paling, 2 coats oil-based',
  ],
  landscaping: [
    'Supply and lay lawn — 120m² kikuyu, includes prep',
    'Install garden bed borders — 60m sleeper edging',
    'Remove and replace front yard — turf, mulch, plants',
    'Install irrigation system — 8 zone, front and back',
  ],
  concreting: [
    'Pour driveway — 40m², 100mm thick, broom finish',
    'Shed slab — 6m × 4m, 100mm with mesh reinforcing',
    'Footpath — 20m × 1.2m, 75mm, exposed aggregate',
    'Cut and repair concrete — 5m² driveway crack repair',
  ],
  fencing: [
    'Supply and install Colorbond fence — 40m, 1.8m high',
    'Replace timber paling fence — 20m both sides',
    'Install pool fence — 25m glass panel, compliant',
    'Concrete in and replace 8x timber posts',
  ],
  tiling: [
    'Tile bathroom floor and walls — 8m² floor, 25m² walls',
    'Kitchen splashback — 3m × 0.6m, subway tile',
    'Outdoor entertaining area tiles — 40m² porcelain',
    'Remove and relay loose tiles — 15m² bathroom floor',
  ],
  aircon: [
    'Supply and install split system — 6kW living area',
    'Service and regass 3x existing split systems',
    'Install ducted system — 4 bedroom home, 14kW',
    'Replace compressor unit — same brand, same location',
  ],
  roofing: [
    'Reseal and repaint Colorbond roof — 180m²',
    'Replace broken tiles — storm damage, 40 tiles',
    'Install whirlybirds — 4x 300mm on ridge',
    'Full re-roof — remove terracotta, replace Colorbond',
  ],
  general: [
    'Mount 75" TV to brick wall — supply and install bracket',
    'Install floating shelves — 6x 1.2m timber shelves',
    'Replace 4x door handles and locks throughout house',
    'Assemble and install flat-pack furniture — 4 items',
  ],
};

function getTradeKey(tradeType?: string | null): string {
  const t = (tradeType || '').toLowerCase();
  if (t.includes('plumb')) return 'plumbing';
  if (t.includes('electr')) return 'electrical';
  if (t.includes('carp') || t.includes('build')) return 'carpentry';
  if (t.includes('paint')) return 'painting';
  if (t.includes('landscape') || t.includes('garden')) return 'landscaping';
  if (t.includes('concret')) return 'concreting';
  if (t.includes('fenc')) return 'fencing';
  if (t.includes('tile') || t.includes('tiler')) return 'tiling';
  if (t.includes('hvac') || t.includes('air')) return 'aircon';
  if (t.includes('roof')) return 'roofing';
  return 'general';
}

const DEFAULT_LINES: LineItem[] = [{ name: '', qty: '1', price: '' }];

export default function QuoteCreateScreen() {
  const {
    customerName: prefillName,
    customerId: prefillCustomerId,
    quoteId: editIdParam,
  } = useLocalSearchParams<{ customerName?: string; customerId?: string; quoteId?: string }>();

  const editId = editIdParam ? Number(editIdParam) : 0;
  const isEditing = editId > 0;

  const { data: settings } = useSettings();
  const tradeKey = getTradeKey(settings?.tradeType);
  const quickSuggestions = TRADE_SUGGESTIONS[tradeKey] ?? TRADE_SUGGESTIONS.general;

  const { data: allCustomers } = useCustomers() as any;
  const [custSearch, setCustSearch] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const filteredCustomers = useMemo(() => {
    const list: any[] = allCustomers || [];
    if (!custSearch.trim()) return list.slice(0, 6);
    return list.filter((c: any) => c.name?.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 6);
  }, [allCustomers, custSearch]);

  const [mode, setMode] = useState<Mode>((prefillName || isEditing) ? 'form' : 'ai');
  const [aiDescription, setAiDescription] = useState('');
  const [descFocused, setDescFocused] = useState(false);
  const [customer, setCustomer]   = useState(prefillName || '');
  const [customerId, setCustomerId] = useState<number | null>(
    prefillName && prefillCustomerId ? Number(prefillCustomerId) : null
  );
  const selectedCustomer = (allCustomers as any[])?.find((c: any) => c.id === customerId);
  const [jobTitle, setJobTitle]   = useState('');
  const [schedDate, setSchedDate]     = useState('');
  const [expiryDate, setExpiryDate]   = useState(() => format(addDays(new Date(), 30), 'd MMM yyyy'));
  const [notes, setNotes]             = useState('');
  const [lines, setLines]         = useState<LineItem[]>(DEFAULT_LINES);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [populated, setPopulated] = useState(false);

  // Line item modal
  const [editLineIdx, setEditLineIdx]   = useState<number | null>(null);
  const [editLineDraft, setEditLineDraft] = useState<LineItem>({ name: '', qty: '1', price: '' });

  const openLineEdit = (i: number) => {
    setEditLineDraft({ ...lines[i] });
    setEditLineIdx(i);
  };

  const saveLineEdit = () => {
    if (editLineIdx !== null) {
      setLines(prev => prev.map((l, i) => i === editLineIdx ? editLineDraft : l));
    }
    setEditLineIdx(null);
  };

  const deleteLineFromModal = () => {
    if (editLineIdx !== null) {
      setLines(prev => prev.filter((_, i) => i !== editLineIdx));
    }
    setEditLineIdx(null);
  };

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
    setExpiryDate(c.expiryDate || format(addDays(new Date(), 30), 'd MMM yyyy'));
    setNotes(c.notes || '');
    if (c.lines?.length > 0) {
      setLines(c.lines.map((l: any) => ({
        name: l.name || '',
        qty: String(l.qty || 1),
        price: String(l.price || ''),
      })));
    } else if (c.items?.length > 0) {
      // AI-generated quotes store `items` ({description, quantity, unitPrice}), not `lines`
      setLines(c.items.map((it: any) => ({
        name: it.description || '',
        qty: String(it.quantity || 1),
        price: String(it.unitPrice || ''),
      })));
    }
    setPopulated(true);
  }, [editQuote]);

  const subtotal = lines.reduce((s, l) => {
    const q = parseFloat(l.qty)  || 0;
    const p = parseFloat(l.price) || 0;
    return s + q * p;
  }, 0);
  const gst   = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + gst;

  const addLine = () => {
    const newIdx = lines.length;
    setLines(prev => [...prev, { name: '', qty: '1', price: '' }]);
    // Open modal for the new item
    setEditLineDraft({ name: '', qty: '1', price: '' });
    setEditLineIdx(newIdx);
  };

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Allow access to your photo library to attach a receipt.');
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
      // When editing, merge over the original content so AI fields
      // (summary, customer phone/email, gst breakdown…) survive the edit
      let originalContent: any = {};
      if (isEditing) {
        try { originalContent = JSON.parse((editQuote as any)?.content || '{}'); } catch {}
      }
      const mergedContent: any = {
        ...originalContent,
        customerName: customer, jobTitle, schedDate, expiryDate, notes, lines,
      };
      if (originalContent.items) {
        // Keep the AI `items` shape in sync with the edited lines
        mergedContent.items = lines.map(l => ({
          description: l.name,
          quantity: parseFloat(l.qty) || 1,
          unit: 'ea',
          unitPrice: parseFloat(l.price) || 0,
        }));
        mergedContent.subtotal = subtotal;
        mergedContent.gstAmount = gst;
        mergedContent.totalAmount = total;
      }
      const body = {
        totalAmount: String(total),
        status,
        customerId: customerId ?? undefined,
        jobTitle: jobTitle.trim() || undefined,
        content: JSON.stringify(mergedContent),
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
    onError: () => showAlert('Could not save', 'Check your connection and try again.'),
  });

  const hasWork = () =>
    aiDescription.trim() || customer.trim() || jobTitle.trim() || schedDate.trim() || notes.trim() ||
    lines.some(l => l.name.trim() || l.qty !== '1' || l.price.trim());

  const handleBack = () => {
    if (hasWork() && !isEditing) {
      showConfirm({
        title: 'Leave without saving?',
        message: 'Your quote details will be lost.',
        confirmLabel: 'Leave',
        destructive: true,
        onConfirm: () => router.back(),
      });
    } else {
      router.back();
    }
  };

  const handleSave = (status: 'draft' | 'sent') => {
    if (!jobTitle.trim()) { setError('Job title is required'); return; }
    if (lines.every(l => !l.price || parseFloat(l.price) <= 0)) {
      setError('Add at least one line item with a price'); return;
    }
    const hasBlankPricedLine = lines.some(l => parseFloat(l.price) > 0 && !l.name.trim());
    if (hasBlankPricedLine) { setError('All priced line items need a description'); return; }
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

  const editLineTotal = (parseFloat(editLineDraft.qty) || 0) * (parseFloat(editLineDraft.price) || 0);

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

        {/* Mode toggle — hidden in edit mode */}
        {!isEditing && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
            <View style={s.modeToggle}>
              {([
                { id: 'ai',   label: 'Use AI',  Icon: Sparkles },
                { id: 'form', label: 'Manual',   Icon: FileText },
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

            <Text style={s.sectionEyebrow}>Quick suggestions</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {quickSuggestions.map((sug, i) => (
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
                onPress={() => showAlert('Templates', "Quote templates are coming soon.\n\nYou'll be able to save any quote as a template and reuse it with one tap.")}
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

            {/* Live margin slider — cost estimated from your usual markup */}
            {subtotal > 0 && (() => {
              const markupPercent = settings?.markupPercent ?? 15;
              const cost = subtotal / (1 + markupPercent / 100);
              return (
                <MarginSlider
                  cost={cost}
                  price={subtotal}
                  onPriceChange={(newSubtotal) => {
                    if (subtotal <= 0) return;
                    const scale = newSubtotal / subtotal;
                    setLines(prev => prev.map(l => {
                      const price = parseFloat(l.price) || 0;
                      return { ...l, price: (price * scale).toFixed(2) };
                    }));
                  }}
                />
              );
            })()}

            <Text style={s.sectionEyebrow}>Details</Text>
            <View style={s.fieldGroup}>
              <View style={[s.fieldRow, { flexWrap: 'wrap', alignItems: 'flex-start', paddingVertical: 12 }]}>
                <Text style={[s.fieldLabel, { paddingTop: 4 }]}>Customer</Text>
                <View style={{ flex: 1 }}>
                  {selectedCustomer ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PAPER_DEEP, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: ORANGE }}>{selectedCustomer.name?.slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: INK, flex: 1 }} numberOfLines={1}>{selectedCustomer.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setCustomerId(null); setCustomer(''); setCustSearch(''); }} activeOpacity={0.7}>
                        <X size={16} color={MUTED} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={s.fieldInput}
                        placeholder="Search or type name…"
                        placeholderTextColor={MUTED}
                        value={custSearch || customer}
                        onChangeText={v => { setCustSearch(v); setCustomer(v); setCustomerId(null); setShowCustList(true); }}
                        onFocus={() => setShowCustList(true)}
                        returnKeyType="next"
                      />
                      {showCustList && filteredCustomers.length > 0 && (
                        <View style={{ position: 'absolute', top: 38, left: 0, right: 0, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: LINE_MID, zIndex: 99, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}>
                          {filteredCustomers.map((c: any) => (
                            <TouchableOpacity
                              key={c.id}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: LINE_SOFT }}
                              activeOpacity={0.7}
                              onPress={() => { setCustomerId(c.id); setCustomer(c.name); setCustSearch(''); setShowCustList(false); }}
                            >
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: ORANGE }}>{c.name?.slice(0, 2).toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: INK }}>{c.name}</Text>
                                {c.phone && <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: MUTED }}>{c.phone}</Text>}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
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
                  placeholder={format(new Date(), "EEE d MMM · h:mm a")}
                  placeholderTextColor={MUTED}
                  value={schedDate}
                  onChangeText={setSchedDate}
                  returnKeyType="next"
                />
              </View>
              <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <Text style={s.fieldLabel}>Expires</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="e.g. 30 Jun 2026"
                  placeholderTextColor={MUTED}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
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

            {/* Line items — tap entire row to edit */}
            <Text style={s.sectionEyebrow}>Line items</Text>
            <View style={[s.fieldGroup, { padding: 0 }]}>
              {lines.map((item, i) => {
                const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => openLineEdit(i)}
                    style={[s.lineItemRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.lineNameText, !item.name && { color: MUTED }]} numberOfLines={1}>
                        {item.name || 'Tap to describe item…'}
                      </Text>
                      <Text style={s.lineMetaText}>
                        {item.qty || 1} × ${item.price || '0'}
                      </Text>
                    </View>
                    <Text style={s.lineTotalText}>
                      ${lineTotal.toLocaleString()}
                    </Text>
                    <ChevronRight size={16} color={MUTED} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <TouchableOpacity
                style={[s.secondaryBtn, { minWidth: 120 }]}
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
                style={[s.primaryBtn, { flex: 2, minWidth: 160 }]}
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

      {/* ── Line item edit modal ── */}
      <Modal
        visible={editLineIdx !== null}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        onRequestClose={() => setEditLineIdx(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setEditLineIdx(null)} style={s.modalCancelBtn}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>Line item</Text>
              <TouchableOpacity onPress={saveLineEdit} style={s.modalDoneBtn}>
                <Text style={s.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {/* Description */}
              <Text style={s.modalLabel}>Description</Text>
              <View style={s.modalInputWrap}>
                <TextInput
                  style={s.modalTextArea}
                  placeholder="What does this item cover?"
                  placeholderTextColor={MUTED}
                  value={editLineDraft.name}
                  onChangeText={v => setEditLineDraft(d => ({ ...d, name: v }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              {/* Qty + Price side by side */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>Quantity</Text>
                  <View style={s.modalInputWrap}>
                    <TextInput
                      style={s.modalInput}
                      value={editLineDraft.qty}
                      onChangeText={v => setEditLineDraft(d => ({ ...d, qty: v }))}
                      keyboardType="numeric"
                      selectTextOnFocus
                      placeholder="1"
                      placeholderTextColor={MUTED}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>Unit price ($)</Text>
                  <View style={s.modalInputWrap}>
                    <TextInput
                      style={s.modalInput}
                      value={editLineDraft.price}
                      onChangeText={v => setEditLineDraft(d => ({ ...d, price: v }))}
                      keyboardType="numeric"
                      selectTextOnFocus
                      placeholder="0"
                      placeholderTextColor={MUTED}
                    />
                  </View>
                </View>
              </View>

              {/* Running total for this item */}
              <View style={s.modalTotalCard}>
                <Text style={s.modalTotalLabel}>Item total</Text>
                <Text style={s.modalTotalAmt}>
                  ${editLineTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Delete */}
              {(lines.length > 1) && (
                <TouchableOpacity
                  style={s.deleteLineBtn}
                  activeOpacity={0.7}
                  onPress={() => showConfirm({
                    title: 'Remove item?',
                    confirmLabel: 'Remove',
                    destructive: true,
                    onConfirm: deleteLineFromModal,
                  })}
                >
                  <Trash2 size={16} color="#d23b3b" strokeWidth={2} />
                  <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#d23b3b' }}>Remove item</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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

  /* Line items — summary rows */
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  lineNameText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    marginBottom: 3,
  },
  lineMetaText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  lineTotalText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
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

  /* Line item modal */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LINE_SOFT,
  },
  modalCancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 60,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  modalDoneBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  modalDoneText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
  },
  modalLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalInputWrap: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  modalTextArea: {
    padding: 16,
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
    minHeight: 100,
  },
  modalInput: {
    padding: 16,
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  modalTotalCard: {
    marginTop: 24,
    backgroundColor: BLACK,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  modalTotalLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalTotalAmt: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.8,
  },
  deleteLineBtn: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(210,59,59,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(210,59,59,0.15)',
  },
});
