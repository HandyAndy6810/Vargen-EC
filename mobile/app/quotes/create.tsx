import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Grid, Plus } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

type Mode = 'ai' | 'form';

const DEFAULT_LINES = [
  { name: 'Rheem 315L HWU',        qty: 1, price: 1420 },
  { name: 'Labour (2hrs @ $90)',    qty: 2, price: 180  },
];

function FormField({ label, placeholder, value }: { label: string; placeholder?: string; value?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={ff.label}>{label}</Text>
      <View style={ff.field}>
        <Text style={[ff.text, !value && { color: MUTED }]}>{value || placeholder}</Text>
      </View>
    </View>
  );
}

const ff = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  field: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
});

export default function QuoteCreateScreen() {
  const [mode, setMode] = useState<Mode>('ai');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
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
            { id: 'ai',   label: 'Use AI', Icon: Sparkles },
            { id: 'form', label: 'Form',   Icon: Grid },
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
        /* AI mode */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
          <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
            <View style={s.aiAvatar}>
              <Sparkles size={28} color={ORANGE} strokeWidth={2} />
            </View>
            <Text style={s.aiHeadline}>
              Describe the job{'\n'}
              <Text style={{ color: ORANGE }}>in one sentence.</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={s.aiStartBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/ai-chat')}
          >
            <Sparkles size={18} color="#fff" strokeWidth={2} />
            <Text style={s.aiStartBtnText}>Start with AI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('form')} activeOpacity={0.7} style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: MUTED }}>
              Or fill out a form manually
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* Form mode */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
          <FormField label="Customer" placeholder="Search or add" value="Jack Dalton" />
          <FormField label="Job title" placeholder="Hot water swap" />
          <FormField label="Scheduled date" value="Tue 21 Apr · 9:30 am" />
          <FormField label="Notes" placeholder="Anything the customer should see…" />

          <Text style={s.sectionEyebrow}>Line items</Text>
          <View style={[s.card, { padding: 0 }]}>
            {DEFAULT_LINES.map((item, i) => (
              <View
                key={i}
                style={[s.lineRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
              >
                <Text style={s.lineName}>{item.name}</Text>
                <Text style={s.lineQty}>×{item.qty}</Text>
                <Text style={s.lineAmt}>${(item.price * item.qty).toLocaleString()}</Text>
              </View>
            ))}
            <TouchableOpacity style={s.addLineBtn} activeOpacity={0.7}>
              <Plus size={14} color={ORANGE_DEEP} strokeWidth={2.5} />
              <Text style={s.addLineBtnText}>Add line item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.saveDraftBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Text style={s.saveDraftText}>Save draft</Text>
        </TouchableOpacity>
      </View>
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
  aiAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  aiHeadline: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.8,
    textAlign: 'center',
    lineHeight: 28,
  },
  aiStartBtn: {
    width: '100%',
    height: 56,
    borderRadius: 20,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 8,
  },
  aiStartBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lineName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  lineQty: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  lineAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: LINE_MID,
    borderStyle: 'dashed',
  },
  addLineBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  saveDraftBtn: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  saveDraftText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
