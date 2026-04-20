import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreHorizontal, Sparkles, Camera, FileText, Mic, Send, Edit2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const GREEN       = '#2a9d4c';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

type Step = 'prompt' | 'clarify' | 'draft' | 'confirm';

const LINES = [
  { n: 'Rheem 315L Stellar electric HWU', q: 1, p: 1420, sub: 'Supply only' },
  { n: 'Removal + install labour', q: 2, p: 180, sub: '2 hrs @ $90' },
  { n: 'Expansion valve + fittings', q: 1, p: 85 },
  { n: 'Callout fee', q: 1, p: 120 },
];
const SUBTOTAL = LINES.reduce((s, l) => s + l.p * l.q, 0);
const GST = Math.round(SUBTOTAL * 0.1);
const TOTAL = SUBTOTAL + GST;

function AiAvatar({ size = 32 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.33, shadowRadius: 12 }}>
      <Sparkles size={size * 0.55} color="#fff" strokeWidth={2} />
    </View>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
      <AiAvatar size={28} />
      <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT, padding: 12, paddingHorizontal: 14, borderRadius: 18, borderBottomLeftRadius: 4, maxWidth: '78%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 }}>
        {children}
      </View>
    </View>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
      <View style={{ backgroundColor: BLACK, padding: 12, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 4, maxWidth: '82%' }}>
        <Text style={{ fontSize: 14, color: '#fff', lineHeight: 20, fontFamily: 'Manrope_500Medium' }}>{children}</Text>
      </View>
    </View>
  );
}

function TopBar({ step, stepLabel, onBack }: { step: Step; stepLabel: string; onBack: () => void }) {
  const titles: Record<Step, string> = { prompt: 'New quote', clarify: 'New quote', draft: 'Review draft', confirm: 'Send it' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LINE_SOFT }}>
      <TouchableOpacity onPress={onBack} style={s.navBtn}>
        <ChevronLeft size={18} color={INK} strokeWidth={2.1} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: MUTED, letterSpacing: 2, textTransform: 'uppercase' }}>{stepLabel}</Text>
        <Text style={{ fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: -0.3, marginTop: 2 }}>{titles[step]}</Text>
      </View>
      <TouchableOpacity style={s.navBtn}>
        <MoreHorizontal size={18} color={INK} strokeWidth={2.1} />
      </TouchableOpacity>
    </View>
  );
}

export default function AiChatScreen() {
  const [step, setStep] = useState<Step>('prompt');

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const order: Step[] = ['prompt', 'clarify', 'draft', 'confirm'];
    const i = order.indexOf(step);
    if (i < order.length - 1) setStep(order[i + 1]);
  };

  const goBack = () => {
    const order: Step[] = ['prompt', 'clarify', 'draft', 'confirm'];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
    else router.back();
  };

  const stepLabels: Record<Step, string> = {
    prompt: 'AI · Step 1 of 4',
    clarify: 'AI · Step 2 of 4',
    draft: 'AI · Step 3 of 4',
    confirm: 'AI · Step 4 of 4',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar step={step} stepLabel={stepLabels[step]} onBack={goBack} />

        {step === 'prompt' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <AiAvatar size={64} />
              <Text style={{ fontSize: 30, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: -1, lineHeight: 34, marginTop: 18, textAlign: 'center' }}>
                {'What did you\n'}<Text style={{ color: ORANGE }}>quote today?</Text>
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: MUTED_HI, marginTop: 10, lineHeight: 20, textAlign: 'center', maxWidth: 260 }}>
                Type, talk, or photograph it. I'll turn any of them into a proper quote.
              </Text>
            </View>

            <Text style={s.eyebrow}>Try one of these</Text>
            <View style={{ gap: 8 }}>
              {[
                "Swap hot water at Dalton's for $1,840",
                'Quote bathroom reno for K Ng, Newtown',
                "Invoice last week's tap fix for J Chen",
              ].map((sug, i) => (
                <TouchableOpacity key={i} onPress={goNext} activeOpacity={0.7}
                  style={{ textAlign: 'left', padding: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 }}>
                  <Sparkles size={16} color={ORANGE} strokeWidth={2} />
                  <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: INK }}>{sug}</Text>
                  <Text style={{ fontSize: 14, color: MUTED }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity style={[s.quickBtn, { flex: 1 }]}>
                <Camera size={18} color={INK} strokeWidth={2} />
                <Text style={s.quickBtnText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, { flex: 1 }]}>
                <FileText size={18} color={INK} strokeWidth={2} />
                <Text style={s.quickBtnText}>Template</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 'prompt' && (
          <View style={s.composerWrap}>
            <View style={s.composer}>
              <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', color: MUTED, paddingVertical: 10 }}>Describe a job…</Text>
              <TouchableOpacity style={s.composerMic}><Mic size={18} color={INK} strokeWidth={2} /></TouchableOpacity>
              <TouchableOpacity style={s.composerSend} onPress={goNext}>
                <Send size={16} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'clarify' && (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 140 }}>
              <UserBubble>Swap the 315L hot water unit at Dalton's place — same brand, new expansion valve.</UserBubble>

              <AiBubble>
                <Text style={{ fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: INK, lineHeight: 20 }}>
                  Got it. I'll draft a <Text style={{ fontFamily: 'Manrope_800ExtraBold' }}>hot water replacement</Text> quote for <Text style={{ fontFamily: 'Manrope_800ExtraBold' }}>Dalton</Text>.{'\n'}A couple of quick questions:
                </Text>
              </AiBubble>

              <AiBubble>
                <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: INK, fontSize: 14, marginBottom: 4 }}>Which model?</Text>
                <Text style={{ fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: MUTED_HI }}>Last invoice shows a Rheem 315L Stellar.</Text>
              </AiBubble>
              <UserBubble>Same — Rheem 315L Stellar, electric.</UserBubble>

              <AiBubble>
                <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: INK, fontSize: 14, marginBottom: 8 }}>Callout fee?</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {['$0 (waived)', '$120 standard', '$180 after hrs'].map((v) => (
                    <TouchableOpacity key={v} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: v === '$120 standard' ? ORANGE : LINE_MID, backgroundColor: v === '$120 standard' ? ORANGE_SOFT : CARD }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: v === '$120 standard' ? ORANGE_DEEP : INK }}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </AiBubble>

              <AiBubble>
                <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: INK, fontSize: 14, marginBottom: 4 }}>Schedule?</Text>
                <Text style={{ fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: MUTED_HI, marginBottom: 10 }}>
                  I've blocked <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: INK }}>Tue 9:30 am</Text> — your only free 2hr slot.
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: GREEN }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>✓ Lock it in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: CARD, borderWidth: 1, borderColor: LINE_MID }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_700Bold', color: INK }}>Pick another</Text>
                  </TouchableOpacity>
                </View>
              </AiBubble>

              {/* Typing indicator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AiAvatar size={28} />
                <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT, padding: 12, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MUTED, opacity: 0.5 }} />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={s.composerWrap}>
              <TouchableOpacity onPress={goNext} style={s.draftReadyBtn}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={18} color="#fff" strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.4, textTransform: 'uppercase' }}>Draft ready — tap to review</Text>
                  <Text style={{ fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.3, marginTop: 2 }}>Hot water swap — Dalton · $1,840</Text>
                </View>
                <Text style={{ fontSize: 18, color: '#fff' }}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'draft' && (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
              {/* Quote paper */}
              <View style={s.quotePaper}>
                <View style={s.quotePaperGlow} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <View>
                    <Text style={s.eyebrow}>Quote · Draft</Text>
                    <Text style={{ fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: -0.6, marginTop: 2 }}>Hot water swap</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 2 }}>Q-2048 · Sun 19 Apr</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: PAPER_DEEP, borderColor: LINE_MID }]}>
                    <Text style={[s.statusPillText, { color: MUTED_HI }]}>Draft</Text>
                  </View>
                </View>

                <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: PAPER_DEEP, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: ORANGE }}>JD</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: INK }}>Jack Dalton</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: MUTED }}>42 Harbour St, Rozelle · 0412 889 221</Text>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  {LINES.map((l, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: LINE_SOFT }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: INK }}>{l.n}</Text>
                        {(l as any).sub && <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 1 }}>{(l as any).sub}</Text>}
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: MUTED, width: 30, textAlign: 'right', flexShrink: 0 }}>×{l.q}</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: INK, textAlign: 'right', minWidth: 60 }}>${(l.p * l.q).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={{ width: '100%', padding: 10, borderRadius: 10, backgroundColor: ORANGE_SOFT, borderWidth: 1, borderStyle: 'dashed', borderColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: ORANGE_DEEP }}>+ Add line item</Text>
                </TouchableOpacity>

                <View style={{ borderTopWidth: 1, borderTopColor: LINE_SOFT, paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: MUTED_HI }}>Subtotal</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: MUTED_HI }}>${SUBTOTAL.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: MUTED_HI }}>GST (10%)</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: MUTED_HI }}>${GST.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: 0.2 }}>TOTAL</Text>
                    <Text style={{ fontSize: 30, fontFamily: 'Manrope_800ExtraBold', color: ORANGE, letterSpacing: -0.8, lineHeight: 34 }}>${TOTAL.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* AI meta */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: ORANGE_SOFT, borderWidth: 1, borderColor: 'rgba(242,106,42,0.25)' }}>
                <Sparkles size={18} color={ORANGE_DEEP} strokeWidth={2} />
                <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: ORANGE_DEEP, lineHeight: 18 }}>
                  Pricing matched to your last 3 similar jobs.{' '}
                  <Text style={{ fontFamily: 'Manrope_800ExtraBold' }}>Nothing surprising.</Text>
                </Text>
              </View>
            </ScrollView>

            <View style={[s.composerWrap, { flexDirection: 'row', gap: 8 }]}>
              <TouchableOpacity style={s.tweakBtn}>
                <Edit2 size={16} color={INK} strokeWidth={2} />
                <Text style={s.tweakBtnText}>Tweak</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.looksRightBtn} onPress={goNext}>
                <Text style={s.looksRightBtnText}>Looks right — continue</Text>
                <Text style={{ fontSize: 16, color: '#fff' }}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'confirm' && (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
              {/* Hero summary */}
              <View style={s.confirmHero}>
                <View style={s.confirmHeroGlow} />
                <Text style={s.eyebrowWhite}>Quote Q-2048</Text>
                <Text style={{ fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.8, marginTop: 4, lineHeight: 32 }}>
                  ${TOTAL.toLocaleString()}<Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontFamily: 'Manrope_700Bold' }}> inc GST</Text>
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
                  Hot water swap · Jack Dalton · Tue 9:30 am
                </Text>
              </View>

              <Text style={[s.eyebrow, { marginTop: 22, marginBottom: 10 }]}>How to send</Text>
              <View style={{ gap: 8 }}>
                {[
                  { icon: 'msg',   label: 'SMS with web link',  sub: '0412 889 221', active: true },
                  { icon: 'email', label: 'Email PDF',           sub: 'jack@dalton.com.au' },
                  { icon: 'pdf',   label: 'Download PDF',        sub: 'Save for later' },
                ].map((o) => (
                  <TouchableOpacity key={o.label} activeOpacity={0.7}
                    style={[s.deliveryRow, { borderWidth: o.active ? 2 : 1, borderColor: o.active ? ORANGE : LINE_SOFT, shadowColor: o.active ? ORANGE : 'transparent', shadowOpacity: o.active ? 0.2 : 0 }]}>
                    <View style={[s.deliveryIcon, { backgroundColor: o.active ? ORANGE_SOFT : PAPER_DEEP }]}>
                      <Text style={{ fontSize: 16 }}>{o.icon === 'msg' ? '💬' : o.icon === 'email' ? '✉️' : '📄'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: INK }}>{o.label}</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 1 }}>{o.sub}</Text>
                    </View>
                    <View style={[s.radioOuter, { borderColor: o.active ? ORANGE : LINE_MID, backgroundColor: o.active ? ORANGE : 'transparent' }]}>
                      {o.active && <Text style={{ fontSize: 10, color: '#fff' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.eyebrow, { marginTop: 22, marginBottom: 10 }]}>SMS preview</Text>
              <View style={{ backgroundColor: PAPER_DEEP, borderRadius: 16, padding: 14 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED_HI, lineHeight: 20 }}>
                  G'day Jack — quote for the hot water swap: ${TOTAL.toLocaleString()} inc GST. Booked for Tue 9:30 am. Tap to accept:{' '}
                  <Text style={{ color: ORANGE, fontFamily: 'Manrope_700Bold' }}>vgn.ec/q/2048</Text>
                </Text>
              </View>
            </ScrollView>

            <View style={s.composerWrap}>
              <TouchableOpacity style={s.sendQuoteBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.back(); }} activeOpacity={0.88}>
                <Send size={18} color="#fff" strokeWidth={2} />
                <Text style={s.sendQuoteBtnText}>Send quote to Jack</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  navBtn: {
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
    letterSpacing: 2,
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  eyebrowWhite: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
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
  composerWrap: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderRadius: 26,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  composerMic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftReadyBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 22,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.33,
    shadowRadius: 28,
    elevation: 10,
  },
  quotePaper: {
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
  },
  quotePaperGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${ORANGE}1f`,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tweakBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  tweakBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  looksRightBtn: {
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
  looksRightBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  confirmHero: {
    backgroundColor: BLACK,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
  },
  confirmHeroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${ORANGE}70`,
    opacity: 0.4,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: CARD,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  deliveryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendQuoteBtn: {
    width: '100%',
    height: 58,
    borderRadius: 22,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  sendQuoteBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.3,
  },
});
