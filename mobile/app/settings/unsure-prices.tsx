import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Animated, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, Search, Plus, X } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, RimCard, wellFill } from '@/components/Rim';
import { BottomSheetModal } from '@/components/BottomSheetModal';
import { Press } from '@/components/Press';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { apiRequest } from '@/lib/api';
import { showAlert } from '@/lib/dialogs';
import { itemKey } from '@shared/price-list';
import { conversionFactor } from '@shared/matcher';
import { useUnsureLines, UNSURE_KEY, type UnsureLine } from '@/hooks/use-unsure';

/** Units for "Add as a new item": the short list, in plain words. */
const NEW_UNITS = ['each', 'sheet', 'length', 'lineal m', 'm²', 'm³', 'bag', 'roll', 'box', 'litre', 'kg', 'tonne'];

const money = (n: number) => `$${n.toFixed(2)}`;

type Pending = { line: UnsureLine; action: 'yes' | 'item'; item: string; unit: string };

/**
 * "Not sure what this is" (docs/pricing-design.md, Build order step 4, part 4).
 *
 * Receipt lines the matcher couldn't place for certain, one tap each:
 *  1. "Yes, it's [best guess]"
 *  2. "It's something else": search their items and their trade's catalogue,
 *     or add it as a new item
 *  3. "Not a material, ignore it"
 * When the units differ and no conversion is certain, one plain question:
 * "How many [unit] is one of these?". Every answer is remembered for that
 * supplier, so the same line never asks again. Never a blocker: lines left
 * here just don't price anything.
 */
export default function UnsurePricesScreen() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { scrollY, scrollProps } = useGradientScroll();
  const { data: lines, isLoading } = useUnsureLines();
  const [busy, setBusy] = useState<number | null>(null);
  const [picking, setPicking] = useState<UnsureLine | null>(null);
  const [asking, setAsking] = useState<Pending | null>(null);
  const [answer, setAnswer] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: UNSURE_KEY });
    qc.invalidateQueries({ queryKey: ['/api/price-list'] });
  };

  const send = async (line: UnsureLine, body: Record<string, unknown>) => {
    setBusy(line.id);
    try {
      const r = await apiRequest('POST', `/api/price-unsure/${line.id}/resolve`, body);
      const data = await r.json().catch(() => ({}));
      if (r.status === 422 && data?.needsConversion) return 'ask';
      if (!r.ok) throw new Error(data?.message || 'Could not save that.');
      if (data?.heldBack) showAlert('Saved, but not as a price', 'That price looks like a slip, so it wasn\'t added to your prices.');
      refresh();
      return 'done';
    } catch (e: any) {
      showAlert('Couldn\'t save that', e?.message || 'Check your connection and try again.');
      return 'error';
    } finally {
      setBusy(null);
    }
  };

  /** Pick an item: ask the one question first if the units can't be converted for certain. */
  const choose = async (p: Pending) => {
    const known = p.action === 'yes' && p.line.guess?.factor
      ? p.line.guess.factor
      : conversionFactor(p.line.text, p.line.unit, p.unit);
    if (!known) { setAnswer(''); setAsking(p); return; }
    const out = await send(p.line, p.action === 'yes' ? { action: 'yes' } : { action: 'item', item: p.item, unit: p.unit });
    if (out === 'ask') { setAnswer(''); setAsking(p); }
  };

  const confirmAnswer = async () => {
    if (!asking) return;
    const n = Number(answer.replace(',', '.'));
    if (!(n > 0)) { showAlert('How many?', `Type how many ${asking.unit} one of these is, like 1 or 14.4.`); return; }
    const p = asking;
    setAsking(null);
    await send(p.line, p.action === 'yes' ? { action: 'yes', factor: n } : { action: 'item', item: p.item, unit: p.unit, factor: n });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Your prices" title="Not sure what these are" />
      <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 12 }}>
        <Text style={s.lead}>
          Lines from your receipts we couldn't match for sure. Tell us what each one is and we'll remember it,
          so it prices itself next time. Leaving them here is fine too.
        </Text>
        {isLoading ? <ActivityIndicator color={c.orange} style={{ marginTop: 20 }} /> : null}
        {!isLoading && !lines?.length ? (
          <RimCard padding="lg">
            <Text style={s.empty}>All sorted. Nothing to check.</Text>
          </RimCard>
        ) : null}
        {lines?.map((l) => (
          <RimCard key={l.id} padding="md" style={{ gap: 10 }}>
            <View>
              <Text style={s.printed}>{l.text}</Text>
              <Text style={s.meta}>
                {[l.supplier, l.receiptDate ? safeDate(l.receiptDate) : null].filter(Boolean).join(' · ')}
              </Text>
              <Text style={s.paid}>
                {l.quantity} {l.unit || 'each'} · {money(l.perUnit)} each as paid
              </Text>
              {l.guess ? <Text style={s.guess}>Our best guess: {l.guess.item} ({l.guess.unit})</Text> : null}
            </View>
            {busy === l.id ? <ActivityIndicator color={c.orange} /> : (
              <View style={{ gap: 8 }}>
                {l.guess ? (
                  <Press style={s.yes} pressedStyle={{ opacity: 0.85 }} accessibilityRole="button"
                    onPress={() => choose({ line: l, action: 'yes', item: l.guess!.item, unit: l.guess!.unit })}>
                    <Check size={16} color="#fff" strokeWidth={2.6} />
                    <Text style={s.yesText} numberOfLines={2}>Yes, it's {l.guess.item}</Text>
                  </Press>
                ) : null}
                <Press style={s.other} pressedStyle={{ opacity: 0.8 }} accessibilityRole="button" onPress={() => setPicking(l)}>
                  <Text style={s.otherText}>It's something else</Text>
                </Press>
                <Press style={s.ignore} pressedStyle={{ opacity: 0.7 }} accessibilityRole="button" onPress={() => send(l, { action: 'ignore' })}>
                  <Text style={s.ignoreText}>Not a material, ignore it</Text>
                </Press>
              </View>
            )}
          </RimCard>
        ))}
      </Animated.ScrollView>

      <ItemPicker
        line={picking}
        onClose={() => setPicking(null)}
        onPick={(item, unit) => { const l = picking!; setPicking(null); choose({ line: l, action: 'item', item, unit }); }}
      />

      <BottomSheetModal visible={!!asking} onClose={() => setAsking(null)}>
        {asking ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={s.askTitle}>How many {asking.unit} is one of these?</Text>
            <Text style={s.meta}>"{asking.line.text}", bought as {asking.line.unit || 'each'}.</Text>
            <TextInput
              style={s.askInput}
              value={answer}
              onChangeText={setAnswer}
              keyboardType="decimal-pad"
              placeholder={asking.line.guess?.aiFactor ? `e.g. ${asking.line.guess.aiFactor}` : 'e.g. 1'}
              placeholderTextColor={c.muted}
              autoFocus
            />
            <Press style={s.yes} pressedStyle={{ opacity: 0.85 }} onPress={confirmAnswer} accessibilityRole="button">
              <Text style={s.yesText}>Save</Text>
            </Press>
          </View>
        ) : null}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

function safeDate(iso: string) {
  try { return format(new Date(`${iso}T12:00:00`), 'd MMM yyyy'); } catch { return iso; }
}

/** "It's something else": their items and their trade's catalogue, searchable, plus "Add as a new item". */
function ItemPicker({ line, onClose, onPick }: { line: UnsureLine | null; onClose: () => void; onPick: (item: string, unit: string) => void }) {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('each');
  const { data: choices } = useQuery<{ item: string; unit: string }[]>({
    queryKey: ['/api/price-unsure/choices'],
    enabled: !!line,
    queryFn: async () => (await apiRequest('GET', '/api/price-unsure/choices')).json(),
  });
  const shown = useMemo(() => {
    const k = itemKey(q);
    const all = choices ?? [];
    return k ? all.filter((x) => itemKey(x.item).includes(k)).slice(0, 60) : all.slice(0, 60);
  }, [q, choices]);

  const open = !!line;
  const reset = () => { setQ(''); setAdding(false); setNewName(''); setNewUnit('each'); };

  return (
    <BottomSheetModal visible={open} onClose={() => { reset(); onClose(); }} sheetStyle={{ maxHeight: '85%' }}>
      {line ? (
        <View style={{ padding: 20, gap: 12, flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.askTitle}>What is "{line.text}"?</Text>
            <Press onPress={() => { reset(); onClose(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" pressedStyle={{ opacity: 0.6 }}>
              <X size={18} color={c.muted} strokeWidth={2.2} />
            </Press>
          </View>
          {adding ? (
            <View style={{ gap: 10 }}>
              <TextInput style={s.askInput} value={newName} onChangeText={setNewName} placeholder="Item name" placeholderTextColor={c.muted} />
              <Text style={s.meta}>Priced per</Text>
              <View style={s.unitRow}>
                {NEW_UNITS.map((u) => (
                  <Press key={u} style={[s.unitChip, newUnit === u && s.unitChipOn]} pressedStyle={{ opacity: 0.8 }} onPress={() => setNewUnit(u)} accessibilityRole="button">
                    <Text style={[s.unitText, newUnit === u && s.unitTextOn]}>{u}</Text>
                  </Press>
                ))}
              </View>
              <Press style={[s.yes, !newName.trim() && { opacity: 0.5 }]} disabled={!newName.trim()} pressedStyle={{ opacity: 0.85 }}
                onPress={() => { const n = newName.trim(); const u = newUnit; reset(); onPick(n, u); }} accessibilityRole="button">
                <Text style={s.yesText}>Add it</Text>
              </Press>
            </View>
          ) : (
            <>
              <View style={s.search}>
                <Search size={16} color={c.muted} strokeWidth={2.2} />
                <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search your items" placeholderTextColor={c.muted} autoFocus />
              </View>
              <FlatList
                data={shown}
                keyExtractor={(x, i) => `${x.item}|${x.unit}|${i}`}
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0, maxHeight: 340 }}
                renderItem={({ item: x }) => (
                  <Press style={s.choice} pressedStyle={{ backgroundColor: wellFill(isDark) }} onPress={() => { reset(); onPick(x.item, x.unit); }} accessibilityRole="button">
                    <Text style={s.choiceName}>{x.item}</Text>
                    <Text style={s.choiceUnit}>{x.unit}</Text>
                  </Press>
                )}
              />
              <Press style={s.addNew} pressedStyle={{ opacity: 0.8 }} onPress={() => { setNewName(line.text); setAdding(true); }} accessibilityRole="button">
                <Plus size={15} color={c.orange} strokeWidth={2.6} />
                <Text style={s.addNewText}>Add as a new item</Text>
              </Press>
            </>
          )}
        </View>
      ) : null}
    </BottomSheetModal>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi, marginTop: 4 },
  empty: { fontSize: 14, fontFamily: 'HostGrotesk_600SemiBold', color: c.mutedHi, textAlign: 'center' },
  printed: { fontSize: 16, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
  meta: { fontSize: 12.5, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 3 },
  paid: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: c.ink, marginTop: 6 },
  guess: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: c.mutedHi, marginTop: 4 },
  yes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.orange },
  yesText: { flexShrink: 1, fontSize: 14.5, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff', textAlign: 'center' },
  other: { minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.lineMid },
  otherText: { fontSize: 14.5, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
  ignore: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  ignoreText: { fontSize: 13.5, fontFamily: 'HostGrotesk_700Bold', color: c.mutedHi },
  askTitle: { flex: 1, fontSize: 18, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.3 },
  askInput: { fontSize: 17, fontFamily: 'HostGrotesk_700Bold', color: c.ink, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: wellFill(isDark) },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: wellFill(isDark) },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'HostGrotesk_500Medium', color: c.ink, paddingVertical: 11 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.lineSoft },
  choiceName: { flex: 1, fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  choiceUnit: { fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.muted },
  addNew: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, alignSelf: 'flex-start' },
  addNewText: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.orange },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: wellFill(isDark), borderWidth: 1, borderColor: c.lineSoft },
  unitChipOn: { backgroundColor: c.fillStrong, borderColor: c.fillStrong },
  unitText: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  unitTextOn: { color: c.paper },
});
