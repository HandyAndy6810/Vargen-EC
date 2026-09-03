import { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { unitSell, type LineItem } from '@/hooks/use-quote-draft';

const MIN_PCT = 0;
const MAX_PCT = 150;
const THUMB = 26;
const round2 = (n: number) => Math.round(n * 100) / 100;

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Job-level markup control. As the tradie drags, every figure — cost, markup %,
 * customer price, grand total and profit — recomputes and re-renders on each move
 * event, so there's no apply button and no delay. Markup, not margin:
 * sell = cost x (1 + markup/100), with the resulting true margin shown read-only.
 *
 * Built on PanResponder rather than a gesture/animation library because those are
 * otherwise unused in this app — a live slider isn't worth being the first (and a
 * misconfigured native animation lib crashed the whole screen). The drag reads the
 * touch's absolute X minus the track's measured screen X, which avoids the
 * child-relative locationX bug that made the previous slider oscillate.
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

  const clamp = (p: number) => Math.min(MAX_PCT, Math.max(MIN_PCT, p));
  const [live, setLive] = useState(clamp(markupPct));

  const dragging = useRef(false);
  const trackX = useRef(0);
  const trackW = useRef(1);
  const trackRef = useRef<View>(null);

  // Keep in step when the committed value changes from elsewhere (restore, seed),
  // but never yank the thumb out from under an active drag.
  useEffect(() => {
    if (!dragging.current) setLive(clamp(markupPct));
  }, [markupPct]);

  const measure = () => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      trackX.current = x;
      if (w > 0) trackW.current = w;
    });
  };

  const pctFromX = (absX: number) => {
    const rel = absX - trackX.current;
    return clamp((rel / trackW.current) * (MAX_PCT - MIN_PCT) + MIN_PCT);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Don't let the surrounding ScrollView steal the drag — that was silently
      // committing half-finished values before.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        dragging.current = true;
        measure();
        setLive(pctFromX(e.nativeEvent.pageX));
      },
      onPanResponderMove: (e: GestureResponderEvent, g: PanResponderGestureState) => {
        setLive(pctFromX(g.moveX));
      },
      onPanResponderRelease: () => {
        dragging.current = false;
        setLive(prev => { onChange(Math.round(prev)); return prev; });
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        setLive(prev => { onChange(Math.round(prev)); return prev; });
      },
    })
  ).current;

  // Everything derives from the live value so it all moves together on each frame.
  const totalCost = useMemo(
    () => round2(lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.cost || '0') || 0), 0)),
    [lines]
  );
  const subtotal = round2(lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * unitSell(l, live), 0));
  const grand = round2(subtotal * (1 + gstRate));
  const profit = round2(subtotal - totalCost);
  const trueMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;

  const ratio = (live - MIN_PCT) / (MAX_PCT - MIN_PCT);

  return (
    <View style={s.wrap}>
      <Text style={s.eyebrow}>Quote total · inc GST</Text>
      <Text style={s.grand}>{money(grand)}</Text>
      <View style={s.profitRow}>
        <Text style={s.profitLabel}>You make</Text>
        <Text style={s.profit}>{money(profit)}</Text>
      </View>

      <View style={s.readouts}>
        <View style={s.readout}>
          <Text style={s.readoutLabel}>Total cost</Text>
          <Text style={s.readoutValue}>{money(totalCost)}</Text>
        </View>
        <View style={s.readout}>
          <Text style={s.readoutLabel}>Markup</Text>
          <Text style={s.readoutValue}>{Math.round(live)}%</Text>
        </View>
        <View style={s.readout}>
          <Text style={s.readoutLabel}>Customer price</Text>
          <Text style={s.readoutValue}>{money(subtotal)}</Text>
        </View>
      </View>

      <View
        ref={trackRef}
        onLayout={measure}
        style={s.track}
        hitSlop={{ top: 16, bottom: 16 }}
        {...responder.panHandlers}
      >
        <View style={s.trackBg} />
        <View style={[s.trackFill, { width: `${ratio * 100}%` }]} />
        <View style={[s.thumb, { left: ratio * Math.max(0, trackW.current - THUMB) }]} />
      </View>

      <View style={s.footRow}>
        <Text style={s.footLabel}>Markup %</Text>
        <Text style={s.footMargin}>{trueMargin.toFixed(1)}% true margin</Text>
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
  grand: { fontSize: 38, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -1.2, marginTop: 4 },
  profitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  profitLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.muted },
  profit: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.green },
  readouts: {
    flexDirection: 'row', gap: 10, marginTop: 16,
    borderTopWidth: 1, borderTopColor: c.lineSoft, paddingTop: 14,
  },
  readout: { flex: 1 },
  readoutLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  readoutValue: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 3 },
  track: { height: THUMB, justifyContent: 'center', marginTop: 20 },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: c.paperDeep },
  trackFill: { position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: c.orange },
  thumb: {
    position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    backgroundColor: '#fff', borderWidth: 3, borderColor: c.orange,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 5, elevation: 4,
  },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  footLabel: { fontSize: 12.5, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi, letterSpacing: 0.3 },
  footMargin: { fontSize: 12.5, fontFamily: 'Manrope_600SemiBold', color: c.muted },
});
