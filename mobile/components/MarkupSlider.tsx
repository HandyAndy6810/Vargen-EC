import { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, PanResponder,
  type GestureResponderEvent, type LayoutChangeEvent, type PanResponderGestureState,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { unitSell, type LineItem } from '@/hooks/use-quote-draft';
import { hapticTick } from '@/lib/haptics';

const MIN_PCT = 0;
// 80% top end. A tradie's markup normally sits between 15% and 40%, so anchoring the
// scale here puts the starting thumb a genuine quarter to a third along the bar with
// room to pull it back, rather than squeezing every useful position into the first
// sliver as a 200% ceiling did. (This was NOT what made the thumb start at the far
// left — that was the width being kept in a ref alone; see trackWidth below.)
const MAX_PCT = 80;
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
  roundUp = false,
  gstRate = 0.1,
  totalLabel = 'Quote total',
}: {
  lines: LineItem[];
  markupPct: number;
  onChange: (pct: number) => void;
  /** Lands the customer-facing total on a whole dollar. */
  roundUp?: boolean;
  /** 0.1 for a GST-registered tradie, 0 for one who isn't. */
  gstRate?: number;
  /** This card is shared with the invoice flow, where "Quote total" is wrong. */
  totalLabel?: string;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const clamp = (p: number) => Math.min(MAX_PCT, Math.max(MIN_PCT, p));
  const [live, setLive] = useState(clamp(markupPct));

  const dragging = useRef(false);
  const trackX = useRef(0);
  // Width is held twice on purpose: the ref keeps the drag maths synchronous inside
  // gesture handlers, while the state is what re-renders the thumb into position.
  // Width used to be a ref ALONE, and writing to a ref renders nothing — so on the
  // only render that mattered the width was still its initial 1, making the thumb's
  // travel max(0, 1 - 26) = 0. It drew hard left whatever the markup was, and only
  // snapped to the right spot once a drag happened to re-render it.
  const trackW = useRef(1);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);

  // Keep in step when the committed value changes from elsewhere (restore, seed),
  // but never yank the thumb out from under an active drag.
  useEffect(() => {
    if (!dragging.current) setLive(clamp(markupPct));
  }, [markupPct]);

  const setWidth = (w: number) => {
    if (w <= 0) return;
    trackW.current = w;
    setTrackWidth(w);
  };

  /** measureInWindow is the only way to get the absolute X the drag maths needs. */
  const measure = () => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      trackX.current = x;
      setWidth(w);
    });
  };

  // Layout reports the width synchronously, so take it from here too rather than
  // waiting on the async measure — the thumb lands correctly on the first paint.
  const onTrackLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    measure();
  };

  // The thumb is a circle that slides between the track's edges, so the distance it
  // can travel is the track minus its own width, and its CENTRE sits half a thumb in
  // from wherever it's positioned. Measuring against the bare track width instead —
  // as this did — put the maths half a thumb out of step with the drawing, which is
  // what made the thumb jump the moment you touched it.
  const usableW = () => Math.max(1, trackW.current - THUMB);
  const ratioOf = (pct: number) => (pct - MIN_PCT) / (MAX_PCT - MIN_PCT);

  const pctFromX = (absX: number) => {
    const rel = absX - trackX.current - THUMB / 2;
    return clamp((rel / usableW()) * (MAX_PCT - MIN_PCT) + MIN_PCT);
  };

  // Read inside the gesture handlers, which are created once and would otherwise
  // close over the first render's value.
  const liveRef = useRef(live);
  liveRef.current = live;
  const lastStep = useRef(Math.round(clamp(markupPct) / 5));

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
        // Grabbing the thumb picks it up where it is; tapping the bare track still
        // jumps to that spot. Without this, taking hold of the thumb snapped the
        // value to the finger's exact position first.
        const thumbCentre = trackX.current + ratioOf(liveRef.current) * usableW() + THUMB / 2;
        if (Math.abs(e.nativeEvent.pageX - thumbCentre) > THUMB) {
          setLive(pctFromX(e.nativeEvent.pageX));
        }
      },
      onPanResponderMove: (e: GestureResponderEvent, g: PanResponderGestureState) => {
        const next = pctFromX(g.moveX);
        // A tick each time the value crosses a 5% mark, so the markup can be set by
        // feel without watching the number. Fired on the crossing, not every frame —
        // a continuous buzz would just be noise.
        const step = Math.round(next / 5);
        if (step !== lastStep.current) {
          lastStep.current = step;
          hapticTick();
        }
        setLive(next);
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
  // Lines carrying a real price but no cost basis. They add to what the customer
  // pays and nothing to Total cost, so "You make" counts every cent of them as
  // profit. Every quote written before the cost-based engine is entirely made of
  // these, and so is any line typed by hand with "Your cost" left blank — which is
  // why Total cost could read $0 beneath a four-figure job with no hint as to why.
  const uncosted = useMemo(
    () => lines.filter(l =>
      !(parseFloat(l.cost || '0') > 0) &&
      (parseFloat(l.qty) || 0) * unitSell(l, 0) > 0
    ).length,
    [lines]
  );
  const rawSubtotal = round2(lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * unitSell(l, live), 0));
  const rawGrand = round2(rawSubtotal * (1 + gstRate));
  // Rounding lands the GST-inclusive total on a whole dollar, and the subtotal is
  // re-derived from it so the figures still reconcile. This card renders the headline
  // total, so it has to honour the flag — without it the Round up button appeared to
  // do nothing at all, because the only number it changed was its own label.
  const grand = roundUp ? Math.ceil(rawGrand) : rawGrand;
  const subtotal = roundUp ? round2(grand / (1 + gstRate)) : rawSubtotal;
  const profit = round2(subtotal - totalCost);
  const trueMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;

  const ratio = ratioOf(live);
  const thumbTravel = Math.max(0, trackWidth - THUMB);

  return (
    <View style={s.wrap}>
      {/* No "inc GST" when the tradie isn't registered for it — the figure genuinely
          has no tax in it, and saying otherwise on a customer-facing screen is worse
          than saying nothing. */}
      <Text style={s.eyebrow}>{totalLabel}{gstRate > 0 ? ' · inc GST' : ''}</Text>
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

      {/* Say it plainly rather than letting the tradie read a profit figure that
          quietly counts uncosted lines as pure margin. */}
      {uncosted > 0 ? (
        <Text style={s.costWarn}>
          {uncosted === 1 ? '1 item has' : `${uncosted} items have`} no cost recorded, so
          {uncosted === 1 ? ' it counts' : ' they count'} as all profit. Add “Your cost” to
          {uncosted === 1 ? ' that line' : ' those lines'} for a true figure.
        </Text>
      ) : null}

      <View
        ref={trackRef}
        onLayout={onTrackLayout}
        style={s.track}
        hitSlop={{ top: 16, bottom: 16 }}
        {...responder.panHandlers}
      >
        <View style={s.trackBg} />
        {/* Fill stops under the thumb's centre so the two stay visually joined */}
        <View style={[s.trackFill, { width: ratio * thumbTravel + THUMB / 2 }]} />
        <View style={[s.thumb, { left: ratio * thumbTravel }]} />
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
  costWarn: {
    fontSize: 11.5, fontFamily: 'Manrope_600SemiBold', color: c.orangeDeep,
    lineHeight: 16, marginTop: 12,
    backgroundColor: c.orangeSoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
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
