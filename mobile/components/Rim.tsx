import { useEffect, useMemo, useRef, type ReactNode, type ComponentType, type RefObject } from 'react';
import { Animated, Keyboard, Platform, ScrollView, Text, View, StyleSheet, type StyleProp, type ViewStyle, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Press } from './Press';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { mixHex } from '@shared/color';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { rimTile } from '@/theme/rim';

/**
 * The pieces of the Home look, shared so every restyled screen draws them the
 * same way: the orange gradient that fades into the page, the Rim tile, a row
 * for inside a tile, and the header that sits on the gradient.
 */

// ── Gradient ────────────────────────────────────────────────────────────────

// Stop positions down the gradient, and the solid band drawn above its top
// edge so the iOS pull-down bounce shows orange rather than paper.
const STOPS = [0, 0.3036, 0.6429, 1];
export const GRADIENT_BLEED = 400;

type Intensity = 'hero' | 'soft';

/**
 * hero: Home. Full orange at the top, gone by 560px. Unchanged from Home's own
 * gradient (orange mixed into paper at 100/60/18/0% light, 78/42/12/0% dark).
 *
 * soft: everywhere else. Shorter and lighter, so a page of forms or rows reads
 * as part of the same app without shouting. It fades out by about the first
 * card, starting from the top of the screen (status bar included), so it lands
 * in the same place on every phone.
 */
const MIX: Record<Intensity, { light: number[]; dark: number[] }> = {
  hero: { light: [1, 0.6, 0.18, 0], dark: [0.78, 0.42, 0.12, 0] },
  soft: { light: [0.5, 0.26, 0.07, 0], dark: [0.42, 0.2, 0.05, 0] },
};
const SOFT_HEIGHT = 300;

/** The colours at each stop. The last is exactly c.paper, so it ends in the page. */
export function gradientColours(c: Colors, isDark: boolean, intensity: Intensity): string[] {
  return MIX[intensity][isDark ? 'dark' : 'light'].map((t) => mixHex(c.orange, c.paper, t));
}

/**
 * Secondary text on the gradient. Never c.muted there: it fails contrast on
 * orange. Use it for eyebrows, dates and sub text anywhere the gradient shows.
 */
export const heroSecondary = (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.84)' : 'rgba(28,29,33,0.82)');

/**
 * The gradient, absolutely positioned at the top of whatever it's in.
 *
 * - Inside a ScrollView's content (Home): leave scrollY out; it scrolls away
 *   with the content.
 * - Behind a fixed header and a ScrollView (every other screen): render it as
 *   the screen's first child and pass the scroll offset from
 *   useGradientScroll(). It then moves up with the content exactly as if it
 *   were inside it, while the header stays put.
 *
 * Drawn with react-native-svg, not expo-linear-gradient (the installed one is
 * the SDK 53 native module and draws nothing on device).
 */
export function ScreenGradient({ intensity, scrollY, id }: { intensity: Intensity; scrollY?: Animated.Value; id?: string }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const colours = useMemo(() => gradientColours(c, isDark, intensity), [c, isDark, intensity]);
  // Home's gradient is 560px from the top of its scroll content; kept exactly.
  // The soft one is measured from the top of the screen, so a notch doesn't
  // eat into it.
  const height = intensity === 'hero' ? 560 : insets.top + SOFT_HEIGHT;
  const gid = id ?? `screenGradient-${intensity}`;

  const svg = (
    <Svg pointerEvents="none" width="100%" height={GRADIENT_BLEED + height}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          {colours.map((col, i) => (
            <Stop key={i} offset={STOPS[i]} stopColor={col} stopOpacity={1} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height={GRADIENT_BLEED} fill={colours[0]} />
      <Rect x={0} y={GRADIENT_BLEED} width="100%" height={height} fill={`url(#${gid})`} />
    </Svg>
  );

  if (!scrollY) {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: -GRADIENT_BLEED, left: 0, right: 0 }}>
        {svg}
      </View>
    );
  }
  // Moves up with the content; pulled down past the top it follows too, showing
  // the solid band above, the same as Home.
  const translateY = Animated.multiply(scrollY, -1);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: -GRADIENT_BLEED, left: 0, right: 0, transform: [{ translateY }] }}
    >
      {svg}
    </Animated.View>
  );
}

/**
 * Covers the status bar strip (clock, battery, Dynamic Island) on screens whose
 * header scrolls away with the content, so nothing ever shows behind it. It is
 * a window onto the page background: the same gradient, moved by the same
 * scroll offset, over paper. Pass the scrollY the screen's gradient moves with
 * (useGradientScroll), or nothing if the screen doesn't scroll. Render it last,
 * after the scroll view.
 */
export function StatusBarBand({ intensity, scrollY, id }: { intensity: Intensity; scrollY?: Animated.Value; id: string }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, overflow: 'hidden', backgroundColor: c.paper, zIndex: 20, elevation: 20 }}
    >
      <ScreenGradient intensity={intensity} scrollY={scrollY} id={id} />
    </View>
  );
}

/** The scroll offset ScreenGradient follows. Spread `scrollProps` on an Animated.ScrollView or Animated.FlatList. */
export function useGradientScroll(onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const handler = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: onScroll }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollY],
  );
  return { scrollY, scrollProps: { onScroll: handler, scrollEventThrottle: 16 } };
}

/**
 * The fill for small inset controls inside a Rim tile (chips, small inputs,
 * icon squares): a faint tint of the text colour, so it reads in both modes.
 * c.paperDeep is near-black in dark mode and looked like a hole in the tile.
 */
export const wellFill = (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,29,33,0.06)');

// ── Header on the gradient ──────────────────────────────────────────────────

/** A round glass button for the header: back, add, save. */
export function GlassButton({
  onPress, children, label, filled, disabled,
}: { onPress: () => void; children: ReactNode; label: string; filled?: boolean; disabled?: boolean }) {
  const { colors: c, isDark } = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      pressedStyle={{ opacity: 0.75, transform: [{ scale: 0.96 }] }}
      style={[
        {
          width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
          opacity: disabled ? 0.6 : 1,
        },
        filled
          ? { backgroundColor: c.orange }
          : {
              borderWidth: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.62)',
              borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.9)',
            },
      ]}
    >
      {children}
    </Press>
  );
}

/**
 * The header on a soft-gradient screen: back button, eyebrow and title, and an
 * optional action on the right. It doesn't scroll; the gradient behind it does.
 * Pass the top inset yourself only if the screen's SafeAreaView already adds it.
 */
export function GradientHeader({
  eyebrow, title, right, onBack, padTop = true,
}: { eyebrow?: string; title: string; right?: ReactNode; onBack?: (() => void) | null; padTop?: boolean }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: (padTop ? insets.top : 0) + 6 }}>
      {onBack !== null && (
        <GlassButton label="Go back" onPress={onBack ?? (() => router.back())}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </GlassButton>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? (
          <Text style={{ fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: heroSecondary(isDark), letterSpacing: 0.2 }} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={{ fontSize: 24, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.6, lineHeight: 28 }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

// ── Tiles ───────────────────────────────────────────────────────────────────

const PAD = { none: 0, sm: 12, md: 16, lg: 20 } as const;

/**
 * A Rim tile. With onPress it's a button that dims and shrinks slightly while
 * held. `fill` overrides the tile colour (as Home's hero card does).
 */
export function RimCard({
  children, padding = 'md', onPress, onLongPress, style, fill, accessibilityLabel, accessibilityHint, testID,
}: {
  children: ReactNode;
  padding?: keyof typeof PAD;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  fill?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  const { colors: c, isDark } = useTheme();
  // Preset padding as horizontal/vertical, never the `padding` shorthand: a
  // shorthand here would beat a paddingLeft etc. passed in `style` on web.
  const base = useMemo(
    () => ({ ...rimTile(c, isDark, fill), ...(padding === 'none' ? null : { paddingHorizontal: PAD[padding], paddingVertical: PAD[padding] }) }),
    [c, isDark, fill, padding],
  );
  if (!onPress && !onLongPress) {
    return <View style={[base, style]} testID={testID} accessibilityLabel={accessibilityLabel}>{children}</View>;
  }
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      style={[base, style]}
      pressedStyle={{ opacity: 0.85, transform: [{ scale: 0.985 }] }}
    >
      {children}
    </Press>
  );
}

/** The small grey heading above a group of tiles. Pass onGradient when it sits on the orange. */
export function RimGroupLabel({ children, onGradient }: { children: ReactNode; onGradient?: boolean }) {
  const { colors: c, isDark } = useTheme();
  return (
    <Text style={{ fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: onGradient ? heroSecondary(isDark) : c.mutedHi, marginBottom: 8, marginLeft: 2 }}>
      {children}
    </Text>
  );
}

/** A labelled group: heading, one Rim tile holding the rows, optional hint below. */
export function RimGroup({
  title, hint, children, style, onGradient,
}: { title?: string; hint?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>; onGradient?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={[{ paddingHorizontal: 20, paddingTop: 22 }, style]}>
      {title ? <RimGroupLabel onGradient={onGradient}>{title}</RimGroupLabel> : null}
      <RimCard padding="none" style={{ overflow: 'hidden' }}>{children}</RimCard>
      {hint ? (
        typeof hint === 'string'
          ? <Text style={{ fontSize: 12, color: c.muted, fontFamily: 'HostGrotesk_500Medium', marginTop: 8, paddingHorizontal: 4, lineHeight: 17 }}>{hint}</Text>
          : hint
      ) : null}
    </View>
  );
}

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/**
 * A row inside a Rim tile: icon, label, sub text, and a chevron when it opens
 * something. Rows after the first in a tile get a divider (pass `first`).
 */
export function RimRow({
  icon: Icon, label, sub, right, onPress, first, danger, chevron, badge, accessibilityLabel,
}: {
  icon?: IconType;
  label: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  first?: boolean;
  danger?: boolean;
  chevron?: boolean;
  badge?: string;
  accessibilityLabel?: string;
}) {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => rowStyles(c, isDark), [c, isDark]);
  const showChevron = chevron ?? !!onPress;
  const body = (
    <>
      {Icon ? (
        <View style={[s.icon, danger && { backgroundColor: c.redSoft }]}>
          <Icon size={17} color={danger ? c.red : c.ink} strokeWidth={2.1} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[s.label, danger && { color: c.red }]} numberOfLines={1}>{label}</Text>
          {badge ? (
            <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>
          ) : null}
        </View>
        {sub ? <Text style={s.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right}
      {showChevron ? <ChevronRight size={16} color={c.muted} strokeWidth={2} /> : null}
    </>
  );
  const rowStyle = [s.row, !first && s.divider];
  if (!onPress) return <View style={StyleSheet.flatten(rowStyle)}>{body}</View>;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={rowStyle}
      pressedStyle={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(28,29,33,0.04)' }}
    >
      {body}
    </Press>
  );
}

const rowStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
  icon: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,29,33,0.06)',
  },
  label: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.ink, letterSpacing: -0.2, flexShrink: 1 },
  sub: { fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2, lineHeight: 16 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: c.orangeSoft },
  badgeText: { fontSize: 9, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orangeDeep, letterSpacing: 0.5 },
});

/** Field styles for forms inside a Rim tile, shared by Settings and Customers. */
export const fieldStyles = (c: Colors) => StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
  label: { fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: c.mutedHi, marginBottom: 4 },
  input: { fontSize: 15, fontFamily: 'HostGrotesk_500Medium', color: c.ink, padding: 0, minHeight: 22 },
});

/**
 * For inputs near the bottom of a form: when one of them is focused and the
 * keyboard opens, scroll to the end so the field sits above the keyboard. The
 * round 1 fix from AI quoting (st4), shared. Spread the result on those inputs.
 */
export function useKeepAboveKeyboard(scrollRef: RefObject<ScrollView | null>) {
  const focused = useRef(false);
  useEffect(() => {
    const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      if (focused.current) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => sub.remove();
  }, [scrollRef]);
  return {
    onFocus: () => {
      focused.current = true;
      // Keyboard already open (moving between fields): scroll now.
      if (Keyboard.isVisible?.()) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    },
    onBlur: () => { focused.current = false; },
  };
}
