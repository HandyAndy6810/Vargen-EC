import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, type Colors } from '@/hooks/use-theme';

/**
 * The New Quote / New Invoice primary action. The whole background is ONE svg
 * holding two filled paths; the lightning-bolt gap between them is never painted,
 * and the button itself has no fill, so whatever is behind it — the Home
 * gradient, or the page colour — shows through the gap. Light/dark needs no
 * colour logic on the gap.
 *
 * The viewBox is deliberately far wider than any real button: with
 * preserveAspectRatio="xMidYMid slice" the scale is set by the height alone
 * (height / 132), so the bolt stays dead centre and keeps its shape at any
 * width. The viewBox runs from y −22 to 110, so the tips at −14 and 102 sit
 * 8u inside the edges and the whole bolt shows; above and below the tips the
 * two halves meet in a short vertical seam (each half reaches 2u under the
 * other there, so no hairline of background shows). Do not change
 * preserveAspectRatio.
 *
 * The bolt has sharp corners: both halves meet the gap at the same six points —
 * tips (1008,-14) and (992,102), notches (972,54) and (1028,34), inner corners
 * (1000,54) and (1000,34). Anything else drawing this bolt (an intro, a splash,
 * the app icon) must use the same points, or it won't sit flush in the gap.
 *
 * Height and label size follow the screen width (an SE gets 80px / 19pt, a Pro
 * Max 94px / 22pt). Each label is centred in its half's free area: the half,
 * minus the bolt's reach into it plus 8px. "New Invoice" leaves ≥40px spare
 * even on an SE.
 */
const VB_H = 132;
const BOLT_HALF = 28; // viewBox units from the centre line to the notch
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function SplitActionButton({
  onQuote,
  onInvoice,
}: {
  onQuote: () => void;
  onInvoice: () => void;
}) {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { width: screenW } = useWindowDimensions();
  const btnW = screenW - 40; // Home's 20px gutters
  const height = clamp(Math.round(btnW * 0.24), 80, 96);
  const fontSize = clamp(Math.round(btnW * 0.056), 18, 22);
  const boltPad = Math.ceil(BOLT_HALF * (height / VB_H)) + 8;

  return (
    <View style={[s.wrap, { height }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 -22 2000 132"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Quote (left) half — accent orange */}
        <Path
          fill={c.orange}
          d="M 1010,-22 L 1008,-14 L 972,54 L 1000,54 L 992,102 L 992,110 L -1000,110 L -1000,-22 Z"
        />
        {/* Invoice (right) half — graphite in light mode, a mid grey in dark
            (fillStrong, not c.ink, so it never matches the body text); the label
            uses c.paper to match. */}
        <Path
          fill={c.fillStrong}
          d="M 1008,-22 L 3000,-22 L 3000,110 L 990,110 L 992,102 L 1028,34 L 1000,34 L 1008,-14 Z"
        />
      </Svg>

      <View style={s.row}>
        <TouchableOpacity
          style={[s.half, { paddingRight: boltPad }]}
          activeOpacity={0.85}
          onPress={onQuote}
          accessibilityRole="button"
          accessibilityLabel="Start a new quote"
        >
          <Text style={[s.label, { fontSize, color: '#fff' }]} numberOfLines={1}>New Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.half, { paddingLeft: boltPad }]}
          activeOpacity={0.85}
          onPress={onInvoice}
          accessibilityRole="button"
          accessibilityLabel="Start a new invoice"
        >
          <Text style={[s.label, { fontSize, color: c.paper }]} numberOfLines={1}>New Invoice</Text>
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
    // No fill and no glow: the Home gradient sits behind the button, and a solid
    // paper fill would draw a grey bolt on orange. With nothing here, the gap
    // shows whatever is behind it — the original intent.
    backgroundColor: 'transparent',
  },
  row: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  half: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'HostGrotesk_800ExtraBold', letterSpacing: -0.3 },
});
