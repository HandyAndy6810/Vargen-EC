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
  const g = 7;   // half the gap width
  const a = 14;  // horizontal swing of the zigzag
  const cx = w / 2;

  // Lightning zigzag down the centre (top -> bottom): right, left, right, left
  const mid = [
    { x: cx + a, y: 0 },
    { x: cx - a, y: H * 0.42 },
    { x: cx + a, y: H * 0.58 },
    { x: cx - a, y: H },
  ];
  const leftPts = ['0,0', ...mid.map(p => `${p.x - g},${p.y}`), `0,${H}`].join(' ');
  const rightPts = [`${w},0`, ...mid.map(p => `${p.x + g},${p.y}`), `${w},${H}`].join(' ');

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
