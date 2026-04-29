import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, FileText, Plus, Trash2, Camera, Send } from 'lucide-react-native';

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

const DEFAULT_LINES: LineItem[] = [
  { name: 'Rheem 315L HWU',     qty: '1', price: '1420' },
  { name: 'Labour (2hrs @ $90)', qty: '2', price: '90'  },
];

const SUGGESTIONS = [
  "Swap hot water at Dalton's for $1,840",
  'Quote bathroom reno for K Ng, Newtown',
  "Invoice last week's tap fix for J Chen",
];

export default function QuoteCreateScreen() {
  const [mode, setMode] = useState<Mode>('ai');
  const [customer, setCustomer]   = useState('');
  const [jobTitle, setJobTitle]   = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [notes, setNotes]         = useState('');
  const [lines, setLines]         = useState<LineItem[]>(DEFAULT_LINES);

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

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      const res = await apiRequest('POST', '/api/quotes', {
        totalAmount: String(total),
        status,
        content: JSON.stringify({ customerName: customer, jobTitle, schedDate, notes, lines }),
      });
      if (!res.ok) throw new Error('Failed to save quote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      router.back();
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Quotes</Text>
            <Text style={s.title}>New quote</Text>
          </View>
        </View>

        {/* Mode toggle */}
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

        {mode === 'ai' ? (
          /* ── AI mode ── */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
            {/* Hero */}
            <View style={s.aiHero}>
              <View style={s.aiHeroGlow} />
              <View style={s.aiAvatar}>
                <Sparkles size={30} color="#fff" strokeWidth={2} />
              </View>
              <Text style={s.aiHeadline}>
                What are you{'\n'}
                <Text style={{ color: ORANGE }}>quoting today?</Text>
              </Text>
              <Text style={s.aiSubtitle}>
                Describe a job in plain language — I'll price it, build the quote and schedule the booking.
              </Text>
            </View>

            {/* Suggestions */}
            <Text style={s.sectionEyebrow}>Try one of these</Text>
            <View style={{ gap: 8, marginBottom: 14 }}>
              {SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => router.push('/ai-chat')}
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.quickBtn, { flex: 1 }]} activeOpacity={0.7}>
                <Camera size={18} color={INK} strokeWidth={2} />
                <Text style={s.quickBtnText}>Photo / receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, { flex: 1 }]} activeOpacity={0.7} onPress={() => setMode('form')}>
                <FileText size={18} color={INK} strokeWidth={2} />
                <Text style={s.quickBtnText}>Blank form</Text>
              </TouchableOpacity>
            </View>
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
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={14} color={MUTED} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addLineBtn} activeOpacity={0.7} onPress={addLine}>
                <Plus size={14} color={ORANGE_DEEP} strokeWidth={2.5} />
                <Text style={s.addLineBtnText}>Add line item</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Bottom CTAs */}
        {mode === 'ai' ? (
          <View style={s.bottomBar}>
            <TouchableOpacity
              style={s.primaryBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/ai-chat')}
            >
              <Sparkles size={18} color="#fff" strokeWidth={2} />
              <Text style={s.primaryBtnText}>Start with AI</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.bottomBar, { flexDirection: 'row', gap: 10 }]}>
            <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.7} onPress={() => saveMutation.mutate('draft')} disabled={saveMutation.isPending}>
              <Text style={s.secondaryBtnText}>Save draft</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.primaryBtn, { flex: 2 }]} activeOpacity={0.8} onPress={() => saveMutation.mutate('sent')} disabled={saveMutation.isPending}>
              <Send size={16} color="#fff" strokeWidth={2} />
              <Text style={s.primaryBtnText}>Send to customer</Text>
            </TouchableOpacity>
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
    height: 40,
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
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${ORANGE}88`,
    opacity: 0.4,
  },
  aiAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  aiHeadline: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 10,
  },
  aiSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
  },
  sugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
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
    height: 52,
    borderRadius: 14,
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
    padding: 18,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
    width: 72,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    paddingVertical: 2,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lineNameInput: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    paddingVertical: 0,
  },
  lineMetaLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
  lineMetaInput: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    minWidth: 40,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: LINE_MID,
  },
  lineTotal: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: LINE_MID,
  },
  addLineBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  primaryBtn: {
    height: 56,
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
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  secondaryBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
});
