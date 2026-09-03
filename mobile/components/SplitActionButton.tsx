import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, type Colors } from '@/hooks/use-theme';

/**
 * The New Quote / New Invoice primary action. The whole background is ONE svg
 * holding two filled paths; the lightning-bolt gap between them is never painted,
 * so the page colour shows through and light/dark needs no colour logic on the gap.
 *
 * The viewBox is deliberately far wider than any real button: with
 * preserveAspectRatio="xMidYMid slice" the scale factor stays at 1, so the bolt
 * always renders at its true ~76u width, dead centre, at any button width — no
 * width measuring needed. Do not shrink the viewBox or change preserveAspectRatio,
 * and do not round the path decimals (they are the corner-curve tangent points).
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

  return (
    <View style={s.wrap}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 2000 88"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Quote (left) half — accent orange */}
        <Path
          fill={c.orange}
          d="M 1008,-14 L 974.81,48.7 Q 972,54 978,54 L 995,54 Q 1000,54 999.18,58.93 L 992,102 L -1000,102 L -1000,-14 Z"
        />
        {/* Invoice (right) half — the OPPOSITE shade to the page so it always
            contrasts: near-black in light mode, near-white in dark mode. c.ink
            already flips that way with the theme; text uses c.paper to match. */}
        <Path
          fill={c.ink}
          d="M 1008,-14 L 3000,-14 L 3000,102 L 992,102 L 1025.19,39.3 Q 1028,34 1022,34 L 1005,34 Q 1000,34 1000.82,29.07 Z"
        />
      </Svg>

      <View style={s.row}>
        <TouchableOpacity
          style={[s.half, s.halfQuote]}
          activeOpacity={0.85}
          onPress={onQuote}
          accessibilityRole="button"
          accessibilityLabel="Start a new quote"
        >
          <Text style={[s.label, { color: '#fff' }]}>New Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.half, s.halfInvoice]}
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
    height: 88,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 10,
    // Matches the page so the unpainted bolt gap reads as the background, and
    // gives the shadow a surface to cast from.
    backgroundColor: c.paper,
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 10,
  },
  row: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  half: { flex: 1, justifyContent: 'center' },
  halfQuote: { alignItems: 'flex-start', paddingLeft: 28 },
  halfInvoice: { alignItems: 'flex-end', paddingRight: 28 },
  label: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.3 },
});
