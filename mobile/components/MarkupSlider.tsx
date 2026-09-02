import { useMemo } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme, type Colors } from '@/hooks/use-theme';
import type { LineItem } from '@/hooks/use-quote-draft';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const MIN_PCT = 0;
const MAX_PCT = 150;
const THUMB = 26;

/** Worklet-safe currency formatting — no Intl/toLocaleString on the UI thread. */
function money(n: number) {
  'worklet';
  const v = Math.round(Math.abs(n) * 100) / 100;
  const s = v.toFixed(2);
  const dot = s.indexOf('.');
  const intPart = s.slice(0, dot);
  const dec = s.slice(dot);
  let out = '';
  let c = 0;
  for (let i = intPart.length - 1; i >= 0; i--) {
    out = intPart[i] + out;
    c++;
    if (c % 3 === 0 && i > 0) out = ',' + out;
  }
  return (n < 0 ? '-$' : '$') + out + dec;
}

/**
 * Job-level markup control. Everything the tradie reads while dragging — cost,
 * markup %, customer price, grand total and profit — is written straight to the UI
 * thread via animated props, so the numbers move on every frame of the drag with no
 * apply button and no debounce. React state is committed once, on release.
 *
 * Markup, not margin: sell = cost x (1 + markup/100). The resulting true margin is
 * shown read-only underneath so the two numbers are never confused.
 *
 * The old slider read `locationX`, which is measured against whichever child sits
 * under the finger — and the thumb always does — so it oscillated. Pan's `x` here is
 * relative to the track itself, which is what makes this one behave.
 */
export function MarkupSlider({
  lines,
  markupPct,
  onChange,
  gstRate = 0.1,
}: {
  lines: LineItem[];
  markupPct: number;
  onChange: (pct: number) => void;
  gstRate?: number;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  // Flatten to plain number arrays so the maths can run inside a worklet, and so it
  // matches unitSell() exactly (same per-line 2dp rounding) — otherwise the live
  // figure and the settled figure would disagree by a few cents on release.
  const { qtys, costs, lockedUnits, flatUnits, totalCost } = useMemo(() => {
    const q: number[] = [], co: number[] = [], lk: number[] = [], fl: number[] = [];
    let tc = 0;
    for (const l of lines) {
      const qty = parseFloat(l.qty) || 0;
      const cost = parseFloat(l.cost || '0') || 0;
      q.push(qty);
      co.push(cost);
      lk.push(l.markupLocked ? (parseFloat(l.lockedPrice || l.price || '0') || 0) : -1);
      fl.push(parseFloat(l.price || '0') || 0);
      tc += qty * cost;
    }
    return { qtys: q, costs: co, lockedUnits: lk, flatUnits: fl, totalCost: Math.round(tc * 100) / 100 };
  }, [lines]);

  const width = useSharedValue(0);
  const pct = useSharedValue(Math.min(MAX_PCT, Math.max(MIN_PCT, markupPct)));

  const subtotalAt = (m: number) => {
    'worklet';
    let sum = 0;
    for (let i = 0; i < qtys.length; i++) {
      let unit: number;
      if (lockedUnits[i] >= 0) unit = lockedUnits[i];
      else if (costs[i] > 0) unit = Math.round(costs[i] * (1 + m / 100) * 100) / 100;
      else unit = flatUnits[i];
      sum += qtys[i] * unit;
    }
    return Math.round(sum * 100) / 100;
  };

  const pan = Gesture.Pan()
    .onBegin(e => {
      if (width.value <= 0) return;
      pct.value = Math.min(MAX_PCT, Math.max(MIN_PCT, (e.x / width.value) * (MAX_PCT - MIN_PCT) + MIN_PCT));
    })
    .onUpdate(e => {
      if (width.value <= 0) return;
      pct.value = Math.min(MAX_PCT, Math.max(MIN_PCT, (e.x / width.value) * (MAX_PCT - MIN_PCT) + MIN_PCT));
    })
    .onFinalize(() => {
      // Commit once, on release — the readouts above already moved live.
      runOnJS(onChange)(Math.round(pct.value));
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${((pct.value - MIN_PCT) / (MAX_PCT - MIN_PCT)) * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: ((pct.value - MIN_PCT) / (MAX_PCT - MIN_PCT)) * Math.max(0, width.value - THUMB),
  }));

  const pctProps = useAnimatedProps(() => ({ text: `${Math.round(pct.value)}%` } as any));
  const priceProps = useAnimatedProps(() => ({ text: money(subtotalAt(pct.value)) } as any));
  const totalProps = useAnimatedProps(() => ({
    text: money(subtotalAt(pct.value) * (1 + gstRate)),
  } as any));
  const profitProps = useAnimatedProps(() => ({
    text: money(subtotalAt(pct.value) - totalCost),
  } as any));
  const marginProps = useAnimatedProps(() => {
    const sell = subtotalAt(pct.value);
    const m = sell > 0 ? ((sell - totalCost) / sell) * 100 : 0;
    return { text: `${m.toFixed(1)}% true margin` } as any;
  });

  return (
    <View style={s.wrap}>
      {/* Grand total + what the tradie makes */}
      <Text style={s.eyebrow}>Quote total · inc GST</Text>
      <AnimatedTextInput
        style={s.grand}
        animatedProps={totalProps}
        editable={false}
        defaultValue={money(0)}
        pointerEvents="none"
      />
      <View style={s.profitRow}>
        <Text style={s.profitLabel}>You make</Text>
        <AnimatedTextInput
          style={s.profit}
          animatedProps={profitProps}
          editable={false}
          defaultValue={money(0)}
          pointerEvents="none"
        />
      </View>

      {/* Three live values */}
      <View style={s.readouts}>
        <View style={s.readout}>
          <Text style={s.readoutLabel}>Total cost</Text>
          <Text style={s.readoutValue}>{money(totalCost)}</Text>
        </View>
        <View style={s.readout}>
          <Text style={s.readoutLabel}>Markup</Text>
          <AnimatedTextInput
            style={s.readoutValue}
            animatedProps={pctProps}
            editable={false}
            defaultValue="0%"
            pointerEvents="none"
          />
        </View>
        <View style={s.readout}>
          <Text style={s.readoutLabel}>Customer price</Text>
          <AnimatedTextInput
            style={s.readoutValue}
            animatedProps={priceProps}
            editable={false}
            defaultValue={money(0)}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* Track */}
      <GestureDetector gesture={pan}>
        <View
          style={s.track}
          onLayout={e => { width.value = e.nativeEvent.layout.width; }}
          hitSlop={{ top: 14, bottom: 14 }}
        >
          <View style={s.trackBg} />
          <Animated.View style={[s.trackFill, fillStyle]} />
          <Animated.View style={[s.thumb, thumbStyle]} />
        </View>
      </GestureDetector>

      <View style={s.footRow}>
        <Text style={s.footLabel}>Markup %</Text>
        <AnimatedTextInput
          style={s.footMargin}
          animatedProps={marginProps}
          editable={false}
          defaultValue="0.0% true margin"
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: {
    backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.lineSoft,
    padding: 18, marginTop: 8,
  },
  eyebrow: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  grand: {
    fontSize: 38, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
    letterSpacing: -1.2, padding: 0, marginTop: 4, height: 46,
  },
  profitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  profitLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.muted },
  profit: {
    fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.green,
    padding: 0, height: 24, flex: 1,
  },
  readouts: {
    flexDirection: 'row', gap: 10, marginTop: 16,
    borderTopWidth: 1, borderTopColor: c.lineSoft, paddingTop: 14,
  },
  readout: { flex: 1 },
  readoutLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  readoutValue: {
    fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
    padding: 0, marginTop: 3, height: 22,
  },
  track: { height: THUMB, justifyContent: 'center', marginTop: 18 },
  trackBg: {
    position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4,
    backgroundColor: c.paperDeep,
  },
  trackFill: { position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: c.orange },
  thumb: {
    position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    backgroundColor: '#fff', borderWidth: 3, borderColor: c.orange,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 5, elevation: 4,
  },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  footLabel: { fontSize: 12.5, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi, letterSpacing: 0.3 },
  footMargin: {
    fontSize: 12.5, fontFamily: 'Manrope_600SemiBold', color: c.muted,
    padding: 0, height: 18, textAlign: 'right', flex: 1,
  },
});
