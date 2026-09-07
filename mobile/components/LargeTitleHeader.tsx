import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Colors } from '@/hooks/use-theme';

export const LARGE_TITLE_COLLAPSE = 52;

/**
 * The iOS large-title behaviour: a big title that shrinks away as the list scrolls,
 * handing over to a compact bar with the title centred and a hairline beneath it.
 *
 * This is a faithful reimplementation rather than UINavigationBar itself. The tab
 * screens live inside a Tabs navigator with no native header, and getting the real
 * one would mean nesting a Stack under every tab — which changes the routing shape
 * of /quotes and /invoices, both of which already have child routes hanging off
 * them. Not worth destabilising the URLs for a bar; this reads the same to anyone
 * using it.
 *
 * Driven by an Animated.Value the screen feeds from its list's scroll offset, and
 * interpolation runs on the native thread, so it tracks the finger exactly.
 */
export function LargeTitleHeader({
  scrollY,
  eyebrow,
  title,
  right,
}: {
  scrollY: Animated.Value;
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);

  const range = [0, LARGE_TITLE_COLLAPSE];

  // The big title fades and lifts; it's gone before it can collide with the bar.
  const largeOpacity = scrollY.interpolate({
    inputRange: range, outputRange: [1, 0], extrapolate: 'clamp',
  });
  const largeShift = scrollY.interpolate({
    inputRange: range, outputRange: [0, -12], extrapolate: 'clamp',
  });
  // The compact title only appears once the large one has cleared out.
  const compactOpacity = scrollY.interpolate({
    inputRange: [LARGE_TITLE_COLLAPSE * 0.6, LARGE_TITLE_COLLAPSE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // The bar's material and hairline arrive with it — the page reads flat until
  // there's something scrolled underneath to separate from.
  const barOpacity = scrollY.interpolate({
    inputRange: [LARGE_TITLE_COLLAPSE * 0.4, LARGE_TITLE_COLLAPSE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: barOpacity }]}
        pointerEvents="none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={isDark ? 40 : 60} tint={c.blurTint} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper }]} />
        )}
        <View style={[s.hairline, { backgroundColor: c.lineSoft }]} />
      </Animated.View>

      <View style={s.bar} pointerEvents="box-none">
        <Animated.Text style={[s.compactTitle, { opacity: compactOpacity }]} numberOfLines={1}>
          {title}
        </Animated.Text>
        <View style={s.rightSlot}>{right}</View>
      </View>

      <Animated.View
        style={[s.largeBlock, { opacity: largeOpacity, transform: [{ translateY: largeShift }] }]}
        pointerEvents="none"
      >
        <Text style={s.eyebrow}>{eyebrow}</Text>
        <Text style={s.largeTitle} numberOfLines={1}>{title}</Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  bar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20,
  },
  // Centred across the whole bar the way iOS does it, but kept clear of the buttons
  // at either end so a longer title truncates instead of running underneath them.
  compactTitle: {
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
    paddingHorizontal: 110,
    fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2,
  },
  rightSlot: { marginLeft: 'auto' },
  largeBlock: { paddingHorizontal: 20, paddingBottom: 12 },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  largeTitle: {
    fontSize: 32, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
    letterSpacing: -1, marginTop: 2,
  },
});
