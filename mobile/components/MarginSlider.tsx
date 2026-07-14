import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';

const fmt = (n: number) =>
  `$${Math.round(n).toLocaleString('en-AU')}`;

interface MarginSliderProps {
  /** Total cost basis (labour + materials) the price is measured against */
  cost: number;
  /** Current pre-GST price/subtotal */
  price: number;
  /** Called once the user releases the thumb, with the new price */
  onPriceChange: (price: number) => void;
}

export function MarginSlider({ cost, price, onPriceChange }: MarginSliderProps) {
  const { colors: c } = useTheme();
  const st = useMemo(() => makeStyles(c), [c]);
  const min = Math.max(cost, 0);
  const max = Math.max(price * 1.6, min * 1.6, min + 100);

  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [liveValue, setLiveValue] = useState(price);

  const minRef = useRef(min);
  const maxRef = useRef(max);
  const trackWidthRef = useRef(trackWidth);
  const liveValueRef = useRef(price);
  // PanResponder is created once (useRef), so its handlers would otherwise
  // capture the first render's onPriceChange and commit against stale state.
  const onPriceChangeRef = useRef(onPriceChange);

  useEffect(() => { onPriceChangeRef.current = onPriceChange; }, [onPriceChange]);
  useEffect(() => { minRef.current = min; }, [min]);
  useEffect(() => { maxRef.current = max; }, [max]);
  useEffect(() => { trackWidthRef.current = trackWidth; }, [trackWidth]);
  useEffect(() => {
    if (!dragging) {
      setLiveValue(price);
      liveValueRef.current = price;
    }
  }, [price, dragging]);

  const updateFromX = (x: number) => {
    const tw = trackWidthRef.current;
    if (!tw) return;
    const ratio = Math.min(1, Math.max(0, x / tw));
    const lo = minRef.current;
    const hi = maxRef.current;
    const v = Math.min(hi, Math.max(lo, lo + ratio * (hi - lo)));
    liveValueRef.current = v;
    setLiveValue(v);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setDragging(true);
        updateFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromX(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setDragging(false);
        onPriceChangeRef.current(liveValueRef.current);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        onPriceChangeRef.current(liveValueRef.current);
      },
    })
  ).current;

  const profit = liveValue - cost;
  const marginPct = liveValue > 0 ? (profit / liveValue) * 100 : 0;
  const profitColor = profit > 0 ? c.green : c.red;

  const thumbLeft = trackWidth
    ? ((Math.min(max, Math.max(min, liveValue)) - min) / (max - min)) * trackWidth
    : 0;
  const fillWidth = thumbLeft;

  return (
    <View style={st.card}>
      <View style={st.statsRow}>
        <View style={st.stat}>
          <Text style={st.statLabel}>Cost</Text>
          <Text style={st.statValue}>{fmt(cost)}</Text>
        </View>
        <View style={st.stat}>
          <Text style={st.statLabel}>Price</Text>
          <Text style={[st.statValue, { color: c.orange }]}>{fmt(liveValue)}</Text>
        </View>
        <View style={st.stat}>
          <Text style={st.statLabel}>Profit</Text>
          <Text style={[st.statValue, { color: profitColor }]}>
            {fmt(profit)} <Text style={st.statPct}>({marginPct.toFixed(0)}%)</Text>
          </Text>
        </View>
      </View>

      <View
        style={st.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={st.trackBg} />
        <View style={[st.trackFill, { width: fillWidth }]} />
        <View style={[st.thumb, { left: Math.max(0, thumbLeft - 11) }]} />
      </View>

      <View style={st.hintRow}>
        <Text style={st.hintText}>Drag to adjust your price and see the margin update live</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  card: {
    backgroundColor: 'rgba(242,106,42,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.lineSoft,
    padding: 14,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: c.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.2,
  },
  statPct: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  track: {
    height: 28,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.lineMid,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.orange,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: c.orange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  hintRow: {
    marginTop: 8,
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
  },
});
