import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme, type Colors } from '@/hooks/use-theme';

/**
 * The New Quote / New Invoice primary action. The two halves are separated by a
 * lightning-bolt-shaped gap (the page colour shows through the zigzag), rather
 * than a straight or slanted line. Drawn with SVG so the bolt edges stay crisp.
 */
export function SplitActionButton({
  onQuote,
  onInvoice,
}: {
  onQuote: () => void;
  onInvoice: () => void;
}) {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const [w, setW] = useState(0);
  const H = 80;
  const BW = 104; // widest span of the bolt gap
  const cx = w / 2;
  const nx = (v: number) => cx + v * BW; // v is x-offset from centre, −0.5..0.5

  // Real lucide Zap silhouette, normalised (x offset from centre, y fraction).
  // The gap between the two halves *is* this bolt — page colour shows through it.
  // Left edge of the bolt, top→bottom: T, A, B, Bot ; right edge: T, D, C, Bot.
  const T   = { x: 0.056,  y: 0 };
  const A   = { x: -0.5,   y: 0.6 };
  const B   = { x: 0,      y: 0.6 };
  const Bot = { x: -0.056, y: 1 };
  const C   = { x: 0.5,    y: 0.4 };
  const D   = { x: 0,      y: 0.4 };
  const P = (p: { x: number; y: number }) => `${nx(p.x)},${p.y * H}`;
  const leftPts = ['0,0', P(T), P(A), P(B), P(Bot), `0,${H}`].join(' ');
  const rightPts = [`${w},0`, P(T), P(D), P(C), P(Bot), `${w},${H}`].join(' ');

  return (
    <View style={[s.wrap, { height: H }]} onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
          <Polygon points={leftPts} fill={c.orange} />
          <Polygon points={rightPts} fill={c.ink} />
        </Svg>
      )}
      <View style={s.row}>
        <TouchableOpacity
          style={s.half}
          activeOpacity={0.85}
          onPress={onQuote}
          accessibilityRole="button"
          accessibilityLabel="Start a new quote"
        >
          <Text style={s.label}>New Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.half}
          activeOpacity={0.85}
          onPress={onInvoice}
          accessibilityRole="button"
          accessibilityLabel="Start a new invoice"
        >
          <Text style={[s.label, { color: c.paper }]}>New Invoice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: {
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: c.paper,
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 10,
  },
  row: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  half: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.3 },
});
