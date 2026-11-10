import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Animated, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus, Sparkles, X } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, RimCard, RimGroupLabel, wellFill } from '@/components/Rim';
import { Press } from '@/components/Press';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { showAlert } from '@/lib/dialogs';
import { markQuickSetupOffered } from '@/lib/quick-setup-offer';
import { QUICK_SETUP_TRADES, OTHER_TRADE } from '@shared/quick-setup-items';
import { entryKey, changedEntries } from '@shared/quick-setup';

/** A row the tradie can edit under "Other": an AI suggestion or one of their own. */
type OwnRow = { id: string; item: string; unit: string; price: string; suggested: boolean };

const TRADES = [...QUICK_SETUP_TRADES.map((t) => t.trade), OTHER_TRADE];
let nextId = 0;

/**
 * Quick setup (docs/pricing-design.md, Build order step 3).
 *
 *  1. Pick your trade (or several), or Other.
 *  2. Type what you pay for any of that trade's common items. Every box is
 *     optional, and there's a big Skip on both steps.
 *
 * Prices go into the price list as "your price" straight away, so the next AI
 * quote uses them. Other asks "What do you do?" and shows AI suggested items,
 * marked as suggestions, to edit, remove or add to.
 *
 * Opened from Settings (Profile → Your prices) any time, and offered once by
 * the tab layout (?first=1). `then=quote` is the new tradie's path from
 * onboarding: after this, straight into their first quote.
 */
export default function QuickSetupScreen() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useGradientScroll();
  const params = useLocalSearchParams<{ first?: string; then?: string }>();
  const first = params.first === '1';

  const [step, setStep] = useState<'trades' | 'prices'>('trades');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [what, setWhat] = useState('');
  const [own, setOwn] = useState<OwnRow[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Offered once: record it the moment it shows, whatever the tradie does next.
  useEffect(() => {
    markQuickSetupOffered();
    if (first) apiRequest('POST', '/api/price-list/quick-setup/seen').catch(() => {});
  }, [first]);

  // Coming back later: the boxes show what's already saved, and the trades
  // with a saved price start ticked.
  useEffect(() => {
    let live = true;
    apiRequest('GET', '/api/price-list')
      .then((r) => r.json())
      .then((rows: { item: string; unit: string; unitPrice: number }[]) => {
        if (!live || !Array.isArray(rows)) return;
        const map = new Map<string, number>();
        const boxes: Record<string, string> = {};
        for (const r of rows) {
          const k = entryKey(r.item, r.unit);
          map.set(k, Number(r.unitPrice));
          boxes[k] = String(Number(r.unitPrice));
        }
        setSaved(map);
        setPrices(boxes);
        const ticked = QUICK_SETUP_TRADES.filter((t) => t.items.some((i) => map.has(entryKey(i.item, i.unit)))).map((t) => t.trade);
        if (ticked.length) setSelected(new Set(ticked));
      })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const finish = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    if (params.then === 'quote') { router.replace('/quotes/create' as any); return; }
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  };

  const toggle = (trade: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(trade)) next.delete(trade); else next.add(trade);
    return next;
  });

  const suggest = async () => {
    if (!what.trim()) { showAlert('What do you do?', 'Say it in a few words, like "dog groomer" or "wedding photographer".'); return; }
    setSuggesting(true);
    try {
      const r = await apiRequest('POST', '/api/price-list/suggest', { description: what.trim() });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.message || 'No suggestions right now.');
      const items: { item: string; unit: string }[] = Array.isArray(body?.items) ? body.items : [];
      setOwn((prev) => {
        const have = new Set(prev.map((o) => entryKey(o.item, o.unit)));
        const added = items
          .filter((i) => !have.has(entryKey(i.item, i.unit)))
          .map((i) => ({ id: `s${nextId++}`, item: i.item, unit: i.unit, price: '', suggested: true }));
        return [...prev, ...added];
      });
      if (!items.length) showAlert('No suggestions', 'Add your own items below.');
    } catch (e: any) {
      showAlert('No suggestions right now', e?.message || 'Add your own items below.');
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    const rows = [
      ...QUICK_SETUP_TRADES.filter((t) => selected.has(t.trade)).flatMap((t) =>
        t.items.map((i) => ({ item: i.item, unit: i.unit, price: prices[entryKey(i.item, i.unit)] ?? '' }))),
      ...(selected.has(OTHER_TRADE) ? own.filter((o) => o.item.trim() && o.unit.trim()) : []),
    ];
    const entries = changedEntries(rows, saved);
    if (!entries.length) {
      await markSeen();
      finish();
      return;
    }
    setSaving(true);
    try {
      const r = await apiRequest('POST', '/api/price-list/quick-setup', { entries });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.message || 'Could not save your prices.');
      if (Array.isArray(body?.heldBack) && body.heldBack.length) {
        showAlert(
          'Some prices look off',
          `These weren't saved because they look like a typo: ${body.heldBack.join(', ')}. Check them and try again.`,
        );
      }
      finish();
    } catch (e: any) {
      showAlert('Could not save', e?.message || 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Wait for "seen" to land before leaving, so the settings refetch on the way
  // out already has it (otherwise the offer could come round again).
  const markSeen = () => (first ? apiRequest('POST', '/api/price-list/quick-setup/seen').catch(() => {}) : Promise.resolve());
  const skip = async () => {
    await markSeen();
    finish();
  };

  const priceBox = (k: string, value: string, onChange: (v: string) => void, label: string) => (
    <View style={s.priceBox}>
      <Text style={s.dollar}>$</Text>
      <TextInput
        style={s.priceInput}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={c.muted}
        accessibilityLabel={`What you pay for ${label}`}
        key={k}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader
        eyebrow={first ? 'Quick setup' : 'Pricing'}
        title={step === 'trades' ? "What's your trade?" : 'What do you pay?'}
        onBack={step === 'prices' ? () => setStep('trades') : first ? null : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView
          {...scrollProps}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          {step === 'trades' ? (
            <>
              <Text style={s.lead}>
                Pick your trade, or several. Next you can type what you pay for the items you use most, so
                your quotes use your prices. All optional.
              </Text>
              <View style={s.chips}>
                {TRADES.map((t) => {
                  const on = selected.has(t);
                  return (
                    <Press
                      key={t}
                      onPress={() => toggle(t)}
                      style={[s.chip, on && s.chipOn]}
                      pressedStyle={{ opacity: 0.8 }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={t}
                    >
                      {on ? <Check size={14} color={c.paper} strokeWidth={2.6} /> : null}
                      <Text style={[s.chipText, on && s.chipTextOn]}>{t}</Text>
                    </Press>
                  );
                })}
              </View>
              {loading ? <ActivityIndicator color={c.orange} style={{ marginTop: 16 }} /> : null}
            </>
          ) : (
            <>
              <Text style={s.lead}>
                Type what you pay (ex GST) for any of these. Leave the rest blank. You can change them any time in
                Profile → Your prices.
              </Text>
              {QUICK_SETUP_TRADES.filter((t) => selected.has(t.trade)).map((t) => (
                <View key={t.trade} style={{ marginTop: 18 }}>
                  <RimGroupLabel>{t.trade}</RimGroupLabel>
                  <RimCard padding="none" style={{ overflow: 'hidden' }}>
                    {t.items.map((i, idx) => {
                      const k = entryKey(i.item, i.unit);
                      return (
                        <View key={k} style={[s.row, idx > 0 && s.divider]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.itemName}>{i.item}</Text>
                            <Text style={s.itemUnit}>{/^per\b/i.test(i.unit) ? i.unit : `per ${i.unit}`}</Text>
                          </View>
                          {priceBox(k, prices[k] ?? '', (v) => setPrices((p) => ({ ...p, [k]: v })), i.item)}
                        </View>
                      );
                    })}
                  </RimCard>
                </View>
              ))}

              {selected.has(OTHER_TRADE) ? (
                <View style={{ marginTop: 18 }}>
                  <RimGroupLabel>Other</RimGroupLabel>
                  <RimCard padding="md">
                    <Text style={s.fieldLabel}>What do you do?</Text>
                    <TextInput
                      style={s.whatInput}
                      value={what}
                      onChangeText={setWhat}
                      placeholder='e.g. "dog groomer" or "wedding photographer"'
                      placeholderTextColor={c.muted}
                      returnKeyType="search"
                      onSubmitEditing={suggest}
                    />
                    <Press style={s.suggestBtn} pressedStyle={{ opacity: 0.85 }} onPress={suggest} disabled={suggesting} accessibilityRole="button">
                      {suggesting ? <ActivityIndicator color={c.orange} size="small" /> : <Sparkles size={15} color={c.orange} strokeWidth={2.4} />}
                      <Text style={s.suggestText}>Suggest items</Text>
                    </Press>
                  </RimCard>

                  {own.length ? (
                    <RimCard padding="none" style={{ overflow: 'hidden', marginTop: 10 }}>
                      {own.some((o) => o.suggested) ? (
                        <View style={s.suggestNote}>
                          <Sparkles size={13} color={c.orangeDeep} strokeWidth={2.4} />
                          <Text style={s.suggestNoteText}>
                            Suggestions from the AI, not prices. Edit, remove or add your own.
                          </Text>
                        </View>
                      ) : null}
                      {own.map((o, idx) => (
                        <View key={o.id} style={[s.row, (idx > 0 || own.some((x) => x.suggested)) && s.divider]}>
                          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                            {o.suggested ? <Text style={s.suggestedTag}>SUGGESTED</Text> : null}
                            <TextInput
                              style={s.ownName}
                              value={o.item}
                              onChangeText={(v) => setOwn((p) => p.map((x) => (x.id === o.id ? { ...x, item: v } : x)))}
                              placeholder="Item"
                              placeholderTextColor={c.muted}
                            />
                            <TextInput
                              style={s.ownUnit}
                              value={o.unit}
                              onChangeText={(v) => setOwn((p) => p.map((x) => (x.id === o.id ? { ...x, unit: v } : x)))}
                              placeholder="per hour, item, package…"
                              placeholderTextColor={c.muted}
                            />
                          </View>
                          {priceBox(o.id, o.price, (v) => setOwn((p) => p.map((x) => (x.id === o.id ? { ...x, price: v } : x))), o.item || 'this item')}
                          <Press
                            onPress={() => setOwn((p) => p.filter((x) => x.id !== o.id))}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${o.item || 'this item'}`}
                            pressedStyle={{ opacity: 0.6 }}
                          >
                            <X size={16} color={c.muted} strokeWidth={2.2} />
                          </Press>
                        </View>
                      ))}
                    </RimCard>
                  ) : null}
                  <Press
                    style={s.addOwn}
                    pressedStyle={{ opacity: 0.8 }}
                    onPress={() => setOwn((p) => [...p, { id: `o${nextId++}`, item: '', unit: '', price: '', suggested: false }])}
                    accessibilityRole="button"
                  >
                    <Plus size={15} color={c.orange} strokeWidth={2.6} />
                    <Text style={s.suggestText}>Add your own item</Text>
                  </Press>
                </View>
              ) : null}
            </>
          )}
        </Animated.ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          {step === 'trades' ? (
            <Press
              style={[s.primary, !selected.size && { opacity: 0.45 }]}
              pressedStyle={{ opacity: 0.85 }}
              disabled={!selected.size}
              onPress={() => setStep('prices')}
              accessibilityRole="button"
            >
              <Text style={s.primaryText}>Next</Text>
            </Press>
          ) : (
            <Press style={s.primary} pressedStyle={{ opacity: 0.85 }} disabled={saving} onPress={save} accessibilityRole="button">
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Save my prices</Text>}
            </Press>
          )}
          <Press style={s.skip} pressedStyle={{ opacity: 0.7 }} onPress={skip} accessibilityRole="button">
            <Text style={s.skipText}>{first ? 'Skip for now' : 'Skip'}</Text>
          </Press>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, backgroundColor: wellFill(isDark), borderWidth: 1, borderColor: c.lineSoft,
  },
  chipOn: { backgroundColor: c.fillStrong, borderColor: c.fillStrong },
  chipText: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  chipTextOn: { color: c.paper },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
  itemName: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  itemUnit: { fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
  priceBox: {
    flexDirection: 'row', alignItems: 'center', width: 96, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, backgroundColor: wellFill(isDark),
  },
  dollar: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.muted, marginRight: 2 },
  priceInput: { flex: 1, fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.ink, padding: 0 },
  fieldLabel: { fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: c.mutedHi, marginBottom: 6 },
  whatInput: {
    fontSize: 15, fontFamily: 'HostGrotesk_500Medium', color: c.ink, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, backgroundColor: wellFill(isDark),
  },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 6 },
  suggestText: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.orange },
  suggestNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.orangeSoft },
  suggestNoteText: { flex: 1, fontSize: 12, fontFamily: 'HostGrotesk_600SemiBold', color: c.orangeDeep },
  suggestedTag: { fontSize: 9.5, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orangeDeep, letterSpacing: 0.8 },
  ownName: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink, padding: 0 },
  ownUnit: { fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.muted, padding: 0 },
  addOwn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 8, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.lineSoft },
  primary: { height: 52, borderRadius: 16, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff' },
  skip: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: c.lineMid, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 16, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
});
