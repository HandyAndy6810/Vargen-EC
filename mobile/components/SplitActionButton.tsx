import { useEffect, useRef } from 'react';
import { Animated, View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { halvesOffset, buttonScale, buttonShake, setIntroTarget, registerIntroMeasurer } from '@/lib/intro-state';

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
 *
 * The cold start intro (components/IntroOverlay.tsx) moves the two halves with
 * transforms only: each half's path sits in its own svg with exactly the same
 * viewBox and preserveAspectRatio, so at rest (offset 0) the two layers draw
 * precisely what one svg did. Home passes introTarget so the intro can find
 * the gap; the overlay never changes the geometry above.
 */
const VB_H = 132;
const BOLT_HALF = 28; // viewBox units from the centre line to the notch
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Intro transforms (all identity at rest), on React Native's Animated.
const leftShift = Animated.multiply(halvesOffset, -1);
const leftStyle = { transform: [{ translateX: leftShift }] };
const rightStyle = { transform: [{ translateX: halvesOffset }] };
const wrapStyle = { transform: [{ translateY: buttonShake }, { scale: buttonScale }] };

export function SplitActionButton({
  onQuote,
  onInvoice,
  introTarget = false,
}: {
  onQuote: () => void;
  onInvoice: () => void;
  /** Home's button: let the cold start intro measure where the gap is. */
  introTarget?: boolean;
}) {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { width: screenW } = useWindowDimensions();
  const btnW = screenW - 40; // Home's 20px gutters
  const height = clamp(Math.round(btnW * 0.24), 80, 96);
  const fontSize = clamp(Math.round(btnW * 0.056), 18, 22);
  const boltPad = Math.ceil(BOLT_HALF * (height / VB_H)) + 8;

  // Where the gap is on screen, for the intro: Home's button lends the overlay
  // a way to measure it. (Focus events at start-up proved unreliable on the
  // web: Home could blur before its first layout, so the overlay asks instead.)
  const ref = useRef<View>(null);
  useEffect(() => {
    if (!introTarget) return;
    return registerIntroMeasurer(() => {
      ref.current?.measureInWindow((x, y, width, h) => {
        if (width > 0 && h > 0) setIntroTarget({ x, y, width, height: h });
      });
    });
  }, [introTarget]);

  return (
    <Animated.View style={[s.wrap, { height }, wrapStyle]}>
      {/* A plain view to measure: an Animated.View's ref doesn't expose measureInWindow. */}
      <View ref={ref} collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* Quote (left) half — accent orange */}
      <Animated.View style={[StyleSheet.absoluteFill, leftStyle]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 -22 2000 132" preserveAspectRatio="xMidYMid slice">
          <Path
            fill={c.orange}
            d="M 1010,-22 L 1008,-14 L 972,54 L 1000,54 L 992,102 L 992,110 L -1000,110 L -1000,-22 Z"
          />
        </Svg>
      </Animated.View>
      {/* Invoice (right) half — graphite in light mode, a mid grey in dark
          (fillStrong, not c.ink, so it never matches the body text); the label
          uses c.paper to match. */}
      <Animated.View style={[StyleSheet.absoluteFill, rightStyle]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 -22 2000 132" preserveAspectRatio="xMidYMid slice">
          <Path
            fill={c.fillStrong}
            d="M 1008,-22 L 3000,-22 L 3000,110 L 990,110 L 992,102 L 1028,34 L 1000,34 L 1008,-14 Z"
          />
        </Svg>
      </Animated.View>

      <View style={s.row}>
        <TouchableOpacity
          style={[s.half, { paddingRight: boltPad }]}
          activeOpacity={0.85}
          onPress={onQuote}
          accessibilityRole="button"
          accessibilityLabel="Start a new quote"
        >
          <Animated.Text style={[s.label, { fontSize, color: '#fff' }, leftStyle]} numberOfLines={1}>New Quote</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.half, { paddingLeft: boltPad }]}
          activeOpacity={0.85}
          onPress={onInvoice}
          accessibilityRole="button"
          accessibilityLabel="Start a new invoice"
        >
          <Animated.Text style={[s.label, { fontSize, color: c.paper }, rightStyle]} numberOfLines={1}>New Invoice</Animated.Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
