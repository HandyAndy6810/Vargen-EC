import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, Appearance, Easing, Platform, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Polygon, Circle } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import { useRootNavigationState, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { BOLT_POINTS, BOLT_GRADIENT, SPLASH_IMAGE_WIDTH, SPLASH_BACKGROUND } from '@/lib/brand-bolt';
import { splashSquare, gapTarget, gapEnds, arcControl, quadAt, type Rect, type Point } from '@shared/intro-geometry';
import {
  introPending, markIntroDone, subscribeIntro, waitForIntroTarget,
  halvesOffset, buttonScale, buttonShake,
} from '@/lib/intro-state';
import * as K from '@/lib/intro-animation';

/**
 * The cold start intro. Mounted once, above everything, while the intro is
 * pending (lib/intro-state). Its first frame is the native splash, pixel for
 * pixel (same background, the same bolt at the same size and place), so hiding
 * the native splash under it is invisible. Then, if Home's Zap button reports
 * where it is in time, the bolt swoops into the button's gap; otherwise (login,
 * a deep link, Reduce Motion, no button) the frame just fades.
 *
 * It never takes a touch (pointerEvents none), and it always ends: a safety
 * timer removes it even if an animation callback never arrives, and an error
 * boundary removes it (and the splash) if it throws.
 *
 * Animation: React Native's own Animated on the native driver, NOT reanimated.
 * reanimated 3.16 throws the moment it is imported on React Native 0.81 (its
 * Animated.Text rejects RN's function-component Text), which crashed build 3
 * ~0.5 s after launch. The curves (the arc, the spin, the sparks) are sampled
 * into interpolations, which the native driver runs on the UI thread.
 */
export function IntroHost() {
  return <IntroBoundary><IntroHostInner /></IntroBoundary>;
}

/** Any error in the intro: log it, drop the splash, carry on without the intro. */
class IntroBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) {
    console.error('[intro] failed; starting without it:', err);
    SplashScreen.hideAsync().catch(() => {});
    markIntroDone();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function IntroHostInner() {
  const pending = useSyncExternalStore(subscribeIntro, introPending, introPending);
  const [run, setRun] = useState(0);
  const was = useRef(pending);
  useEffect(() => { if (pending && !was.current) setRun((r) => r + 1); was.current = pending; }, [pending]);
  if (!pending) return null;
  return <IntroOverlay key={run} />;
}

type Plan =
  | { kind: 'wait' }
  | { kind: 'fade'; ms: number }
  | { kind: 'fly'; button: Rect };

/** Whether the app was opened by a link or a notification tap (then Home isn't the point). */
// On the web, the page's own path at load is the "link": read it before the
// router redirects anything. Home is "/".
const WEB_START_PATH = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : null;

async function openedByLinkOrNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return !!WEB_START_PATH && WEB_START_PATH.replace(/\/+$/, '') !== '';
  try {
    const url = await Linking.getInitialURL();
    if (url) {
      const { path, hostname } = Linking.parse(url);
      // vargen://quotes/5 parses as hostname "quotes", path "5".
      const where = `${hostname ?? ''}/${path ?? ''}`.replace(/^\/+|\/+$/g, '');
      // Dev clients open with an expo-development-client URL; that isn't a deep link.
      if (where && !where.startsWith('expo-development-client')) return true;
    }
  } catch { /* no link */ }
  try {
    return !!(await Notifications.getLastNotificationResponseAsync());
  } catch { return false; }
}

const NATIVE = Platform.OS !== 'web'; // react-native-web has no native driver
const timing = (v: Animated.Value, toValue: number, duration: number, easing?: (t: number) => number, delay = 0) =>
  Animated.timing(v, { toValue, duration, easing, delay, useNativeDriver: NATIVE });

/**
 * fn(input) as a native-driver interpolation, sampled at `steps` points over
 * [lo, hi] (clamped outside). Covers the WHIP overshoot past 1.
 */
function curve(v: Animated.Value, fn: (x: number) => number, lo = -0.1, hi = 1.3, steps = 56) {
  const inputRange = Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
  return v.interpolate({ inputRange, outputRange: inputRange.map(fn), extrapolate: 'clamp' });
}

function IntroOverlay() {
  const screen = useWindowDimensions();
  // The native splash follows the system appearance (not the app's own theme
  // setting), so the first frame must too.
  const [scheme] = useState<'light' | 'dark'>(() => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'));
  const bg = SPLASH_BACKGROUND[scheme];
  const square = useMemo(() => splashSquare(screen, SPLASH_IMAGE_WIDTH), [screen]);
  const start: Point = { x: square.x + square.width / 2, y: square.y + square.height / 2 };

  const [plan, setPlan] = useState<Plan>({ kind: 'wait' });
  const finished = useRef(false);

  // The navigator's first screen has rendered. Until then this frame simply
  // stands in for the native splash; the 500 ms wait for Home's button starts
  // only after it (capped, so it can never hang).
  const navReady = !!useRootNavigationState()?.key;
  // Home is "/". Any other first screen (login, a deep link) skips the flight.
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const navReadyRef = useRef(navReady);
  const navWaiters = useRef<(() => void)[]>([]);
  useEffect(() => {
    navReadyRef.current = navReady;
    if (navReady) { navWaiters.current.forEach((w) => w()); navWaiters.current = []; }
  }, [navReady]);
  const whenNavReady = () => new Promise<void>((resolve) => {
    if (navReadyRef.current) return resolve();
    navWaiters.current.push(resolve);
    setTimeout(resolve, K.NAV_READY_CAP_MS);
  });

  // Animated values (driven natively once started).
  const v = useRef({
    bgOpacity: new Animated.Value(1),
    boltOpacity: new Animated.Value(1),
    wind: new Animated.Value(0),
    fly: new Animated.Value(0),
    impact: new Animated.Value(0),
    bloom: new Animated.Value(0),
  }).current;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    markIntroDone(); // also puts the button's halves, scale and shake back at rest
  };

  // First frame painted: hide the native splash under it, then decide.
  const onFirstLayout = () => {
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
      decide().catch((e) => { console.error('[intro] decide failed:', e); setPlan({ kind: 'fade', ms: 250 }); });
    });
  };
  const decide = async () => {
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (reduceMotion) return setPlan({ kind: 'fade', ms: K.SKIP_FADE_MS });
    await whenNavReady();
    const [button, deepLink] = await Promise.all([
      waitForIntroTarget(K.TARGET_TIMEOUT_MS),
      openedByLinkOrNotification(),
    ]);
    const onHome = pathRef.current === '/';
    const onScreen = button && button.y > 0 && button.y + button.height < screen.height;
    if (!button || !onScreen || !onHome || deepLink) return setPlan({ kind: 'fade', ms: 250 });
    setPlan({ kind: 'fly', button });
  };

  // Safety: whatever happens, the overlay goes.
  useEffect(() => {
    const t = setTimeout(finish, K.NAV_READY_CAP_MS + K.TARGET_TIMEOUT_MS + 2500);
    return () => clearTimeout(t);
  }, []);

  // Run the plan.
  useEffect(() => {
    if (plan.kind === 'fade') {
      Animated.parallel([timing(v.boltOpacity, 0, plan.ms), timing(v.bgOpacity, 0, plan.ms)]).start(finish);
    }
    if (plan.kind === 'fly') {
      const land = K.WINDUP_MS + K.FLIGHT_MS;
      const afterLanding = (...steps: Animated.CompositeAnimation[]) => Animated.sequence([Animated.delay(land), ...steps]);
      // The halves sit apart while the background still covers Home.
      halvesOffset.setValue(K.HALVES_TRAVEL);
      Animated.parallel([
        timing(v.bgOpacity, 0, K.BG_FADE_MS, Easing.out(Easing.quad), K.BG_FADE_FROM_MS),
        timing(v.wind, 1, K.WINDUP_MS, Easing.out(Easing.quad)),
        timing(v.fly, 1, K.FLIGHT_MS, K.WHIP, K.WINDUP_MS),
        timing(halvesOffset, 0, K.HALVES_MS, Easing.in(Easing.cubic), land - K.HALVES_MS),
        afterLanding(
          timing(buttonScale, 1 + K.PULSE, K.PULSE_MS / 2, Easing.out(Easing.quad)),
          timing(buttonScale, 1, K.PULSE_MS / 2, Easing.inOut(Easing.quad)),
        ),
        afterLanding(
          timing(buttonShake, K.THUD, K.THUD_STEP_MS),
          timing(buttonShake, -K.THUD * 0.6, K.THUD_STEP_MS),
          timing(buttonShake, 0, K.THUD_STEP_MS),
        ),
        afterLanding(
          timing(v.bloom, 1, K.BLOOM_IN_MS, Easing.out(Easing.quad)),
          timing(v.bloom, 0, K.BLOOM_OUT_MS, Easing.in(Easing.quad)),
        ),
        timing(v.boltOpacity, 0, K.BOLT_FADE_MS, Easing.inOut(Easing.quad), land),
        timing(v.impact, 1, K.EMBER_MS, Easing.linear, land),
      ]).start(finish);
    }
  }, [plan]);

  // Geometry of the flight (JS side, plain numbers for the interpolations).
  const flight = useMemo(() => {
    if (plan.kind !== 'fly') return null;
    const t = gapTarget(plan.button, SPLASH_IMAGE_WIDTH);
    const c = arcControl(start, t.center, K.ARC);
    return { end: t.center, scale: t.scale, control: c, ends: gapEnds(plan.button) };
  }, [plan, start.x, start.y]);

  /**
   * One bolt's transform, `lag` of the flight behind the real one. Wind up:
   * draw back to WINDUP_SCALE and turn to -SPIN; the flight unwinds both. The
   * wind up ends exactly when the flight starts, so each is the sum of a
   * wind-up part and a flight part.
   */
  const boltTransform = (lag: number) => {
    const sx = start.x, sy = start.y;
    const end = flight?.end ?? start, ctl = flight?.control ?? start, endScale = flight?.scale ?? 1;
    const f = (x: number) => Math.max(0, x - lag);
    const at = (x: number) => quadAt(start, ctl, end, f(x));
    const scale = Animated.add(
      v.wind.interpolate({ inputRange: [0, 1], outputRange: [1, K.WINDUP_SCALE], extrapolate: 'clamp' }),
      curve(v.fly, (x) => (endScale - K.WINDUP_SCALE) * f(x)),
    );
    const rotate = Animated.add(
      v.wind.interpolate({ inputRange: [0, 1], outputRange: [0, -K.SPIN], extrapolate: 'clamp' }),
      curve(v.fly, (x) => K.SPIN * Math.min(f(x), 1)),
    ).interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
    return [
      { translateX: curve(v.fly, (x) => at(x).x - sx) },
      { translateY: curve(v.fly, (x) => at(x).y - sy) },
      { rotate },
      { scale },
    ];
  };
  const styles_ = useMemo(() => ({
    bolt: { opacity: v.boltOpacity, transform: boltTransform(0) },
    ghost0: {
      opacity: v.fly.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, K.AFTERIMAGE_OPACITY[0], K.AFTERIMAGE_OPACITY[0], 0], extrapolate: 'clamp' }),
      transform: boltTransform(K.AFTERIMAGE_LAG),
    },
    ghost1: {
      opacity: v.fly.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, K.AFTERIMAGE_OPACITY[1], K.AFTERIMAGE_OPACITY[1], 0], extrapolate: 'clamp' }),
      transform: boltTransform(2 * K.AFTERIMAGE_LAG),
    },
    bloom: {
      opacity: v.bloom.interpolate({ inputRange: [0, 1], outputRange: [0, K.GLOW] }),
      transform: [{ scale: v.bloom.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [flight, start.x, start.y]);

  const ex = flight?.end.x ?? start.x, ey = flight?.end.y ?? start.y;
  const boltBox = { left: square.x, top: square.y, width: square.width, height: square.height };
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none" onLayout={onFirstLayout}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bg, opacity: v.bgOpacity }]} />
      {flight ? (
        <Animated.View style={[styles.abs, { left: ex - K.BLOOM / 2, top: ey - K.BLOOM / 2, width: K.BLOOM, height: K.BLOOM }, styles_.bloom]}>
          <Svg width={K.BLOOM} height={K.BLOOM}>
            <Defs>
              <RadialGradient id="introBloom" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFD08A" stopOpacity={1} />
                <Stop offset="0.35" stopColor="#FF9A4D" stopOpacity={0.55} />
                <Stop offset="1" stopColor="#F26A2A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={K.BLOOM / 2} cy={K.BLOOM / 2} r={K.BLOOM / 2} fill="url(#introBloom)" />
          </Svg>
        </Animated.View>
      ) : null}
      {flight && K.AFTERIMAGES >= 2 ? <Animated.View style={[styles.abs, boltBox, styles_.ghost1]}><Bolt id="introG1" /></Animated.View> : null}
      {flight && K.AFTERIMAGES >= 1 ? <Animated.View style={[styles.abs, boltBox, styles_.ghost0]}><Bolt id="introG0" /></Animated.View> : null}
      <Animated.View style={[styles.abs, boltBox, styles_.bolt]}><Bolt id="introBolt" /></Animated.View>
      {flight ? <Sparks at={flight.ends.top} impact={v.impact} seed={1} /> : null}
      {flight ? <Sparks at={flight.ends.bottom} impact={v.impact} seed={2} /> : null}
    </View>
  );
}

/** The Sunset bolt in its 1024 square (the same drawing as splash-icon.png). */
function Bolt({ id }: { id: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {BOLT_GRADIENT.map((s) => <Stop key={s.offset} offset={s.offset} stopColor={s.color} />)}
        </LinearGradient>
      </Defs>
      <Polygon points={BOLT_POINTS} fill={`url(#${id})`} />
    </Svg>
  );
}

/** A small deterministic random, so the sparks look the same every run. */
const rand = (seed: number) => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

function Sparks({ at, impact, seed }: { at: Point; impact: Animated.Value; seed: number }) {
  const parts = useMemo(() => {
    const r = rand(seed);
    const lerp = (a: readonly [number, number]) => a[0] + (a[1] - a[0]) * r();
    const streaks = Array.from({ length: K.SPARK_STREAKS }, (_, i) => ({
      angle: (i / K.SPARK_STREAKS) * Math.PI * 2 + (r() - 0.5) * 0.5,
      reach: lerp(K.STREAK_REACH), length: lerp(K.STREAK_LENGTH),
      color: K.SPARK_COLORS[i % K.SPARK_COLORS.length],
    }));
    const embers = Array.from({ length: K.SPARK_EMBERS }, (_, i) => ({
      angle: r() * Math.PI * 2, reach: lerp(K.EMBER_REACH), size: lerp(K.EMBER_SIZE),
      color: K.SPARK_COLORS[(i + 1) % K.SPARK_COLORS.length],
    }));
    return { streaks, embers };
  }, [seed]);
  return (
    <>
      {parts.streaks.map((p, i) => <Streak key={`s${i}`} at={at} impact={impact} {...p} />)}
      {parts.embers.map((p, i) => <Ember key={`e${i}`} at={at} impact={impact} {...p} />)}
    </>
  );
}

const STREAK_LIFE = K.STREAK_MS / K.EMBER_MS;

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

function Streak({ at, impact, angle, reach, length, color }: {
  at: Point; impact: Animated.Value; angle: number; reach: number; length: number; color: string;
}) {
  const style = useMemo(() => {
    const t = (i: number) => Math.min(1, i / STREAK_LIFE);
    const d = (i: number) => reach * easeOut(t(i));
    return {
      opacity: impact.interpolate({ inputRange: [0, 0.001, STREAK_LIFE, 1], outputRange: [0, 1, 0, 0], extrapolate: 'clamp' }),
      transform: [
        { translateX: curve(impact, (i) => Math.cos(angle) * d(i), 0, 1, 24) },
        { translateY: curve(impact, (i) => Math.sin(angle) * d(i), 0, 1, 24) },
        { rotate: `${angle}rad` },
        { scaleX: impact.interpolate({ inputRange: [0, STREAK_LIFE, 1], outputRange: [1, 0.3, 0.3], extrapolate: 'clamp' }) },
      ],
    };
  }, [impact, angle, reach]);
  return <Animated.View style={[styles.abs, { left: at.x - length / 2, top: at.y - 1, width: length, height: 2, borderRadius: 1, backgroundColor: color }, style]} />;
}

function Ember({ at, impact, angle, reach, size, color }: {
  at: Point; impact: Animated.Value; angle: number; reach: number; size: number; color: string;
}) {
  const style = useMemo(() => ({
    // 1 - t² while it lives, 0 before and after.
    opacity: impact.interpolate({
      inputRange: [0, 0.001, 0.25, 0.5, 0.75, 0.9, 0.999, 1],
      outputRange: [0, 1, 1 - 0.0625, 0.75, 1 - 0.5625, 1 - 0.81, 0.002, 0],
      extrapolate: 'clamp',
    }),
    transform: [
      { translateX: curve(impact, (t) => Math.cos(angle) * reach * easeOut(t), 0, 1, 24) },
      { translateY: curve(impact, (t) => Math.sin(angle) * reach * easeOut(t) + 16 * t * t, 0, 1, 24) }, // a little gravity
    ],
  }), [impact, angle, reach]);
  return <Animated.View style={[styles.abs, { left: at.x - size / 2, top: at.y - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  layer: { zIndex: 1000, elevation: 1000 },
  abs: { position: 'absolute' },
});
