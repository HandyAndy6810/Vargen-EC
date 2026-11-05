import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Appearance, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withSequence, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Polygon, Circle } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import { useRootNavigationState, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { BOLT_POINTS, BOLT_GRADIENT, SPLASH_IMAGE_WIDTH, SPLASH_BACKGROUND } from '@/lib/brand-bolt';
import { splashSquare, gapTarget, gapEnds, arcControl, type Rect, type Point } from '@shared/intro-geometry';
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
 * timer removes it even if an animation callback never arrives.
 */
export function IntroHost() {
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

function IntroOverlay() {
  const screen = useWindowDimensions();
  const reduceMotion = useReducedMotion();
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

  // Animated values (UI thread).
  const bgOpacity = useSharedValue(1);
  const boltOpacity = useSharedValue(1);
  const wind = useSharedValue(0);
  const fly = useSharedValue(0);
  const impact = useSharedValue(0);
  const bloom = useSharedValue(0);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    halvesOffset.value = 0; buttonScale.value = 1; buttonShake.value = 0;
    markIntroDone();
  };

  // First frame painted: hide the native splash under it, then decide.
  const onFirstLayout = () => {
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
      decide();
    });
  };
  const decide = async () => {
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
      const done = () => { 'worklet'; runOnJS(finish)(); };
      boltOpacity.value = withTiming(0, { duration: plan.ms });
      bgOpacity.value = withTiming(0, { duration: plan.ms }, (ok) => { if (ok) done(); });
    }
    if (plan.kind === 'fly') {
      const land = K.WINDUP_MS + K.FLIGHT_MS;
      // The halves sit apart while the background still covers Home.
      halvesOffset.value = K.HALVES_TRAVEL;
      bgOpacity.value = withDelay(K.BG_FADE_FROM_MS, withTiming(0, { duration: K.BG_FADE_MS, easing: Easing.out(Easing.quad) }));
      wind.value = withTiming(1, { duration: K.WINDUP_MS, easing: Easing.out(Easing.quad) });
      fly.value = withDelay(K.WINDUP_MS, withTiming(1, { duration: K.FLIGHT_MS, easing: K.WHIP }));
      halvesOffset.value = withDelay(land - K.HALVES_MS, withTiming(0, { duration: K.HALVES_MS, easing: Easing.in(Easing.cubic) }));
      buttonScale.value = withDelay(land, withSequence(
        withTiming(1 + K.PULSE, { duration: K.PULSE_MS / 2, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: K.PULSE_MS / 2, easing: Easing.inOut(Easing.quad) }),
      ));
      buttonShake.value = withDelay(land, withSequence(
        withTiming(K.THUD, { duration: K.THUD_STEP_MS }),
        withTiming(-K.THUD * 0.6, { duration: K.THUD_STEP_MS }),
        withTiming(0, { duration: K.THUD_STEP_MS }),
      ));
      bloom.value = withDelay(land, withSequence(
        withTiming(1, { duration: K.BLOOM_IN_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: K.BLOOM_OUT_MS, easing: Easing.in(Easing.quad) }),
      ));
      boltOpacity.value = withDelay(land, withTiming(0, { duration: K.BOLT_FADE_MS, easing: Easing.inOut(Easing.quad) }));
      const done = () => { 'worklet'; runOnJS(finish)(); };
      impact.value = withDelay(land, withTiming(1, { duration: K.EMBER_MS, easing: Easing.linear }, (ok) => { if (ok) done(); }));
    }
  }, [plan]);

  // Geometry of the flight (JS side, plain numbers for the worklets).
  const flight = useMemo(() => {
    if (plan.kind !== 'fly') return null;
    const t = gapTarget(plan.button, SPLASH_IMAGE_WIDTH);
    const c = arcControl(start, t.center, K.ARC);
    return { end: t.center, scale: t.scale, control: c, ends: gapEnds(plan.button) };
  }, [plan, start.x, start.y]);
  const sx = start.x, sy = start.y;
  const ex = flight?.end.x ?? sx, ey = flight?.end.y ?? sy;
  const cx = flight?.control.x ?? sx, cy = flight?.control.y ?? sy;
  const endScale = flight?.scale ?? 1;

  // One bolt's transform at a given flight progress (worklet).
  const boltTransform = (f: number, w: number) => {
    'worklet';
    const u = 1 - f;
    const x = u * u * sx + 2 * u * f * cx + f * f * ex;
    const y = u * u * sy + 2 * u * f * cy + f * f * ey;
    // Wind up: draw back to WINDUP_SCALE and turn to -SPIN; the flight unwinds both.
    const scale = f > 0
      ? K.WINDUP_SCALE + (endScale - K.WINDUP_SCALE) * f
      : 1 - (1 - K.WINDUP_SCALE) * w;
    const rotate = -K.SPIN * w * (1 - Math.min(f, 1));
    return [{ translateX: x - sx }, { translateY: y - sy }, { rotate: `${rotate}deg` }, { scale }];
  };

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const boltStyle = useAnimatedStyle(() => ({ opacity: boltOpacity.value, transform: boltTransform(fly.value, wind.value) }));
  const ghost0 = useAnimatedStyle(() => {
    const f = Math.max(0, fly.value - K.AFTERIMAGE_LAG);
    return {
      opacity: interpolate(fly.value, [0, 0.1, 0.85, 1], [0, K.AFTERIMAGE_OPACITY[0], K.AFTERIMAGE_OPACITY[0], 0], Extrapolation.CLAMP),
      transform: boltTransform(f, wind.value),
    };
  });
  const ghost1 = useAnimatedStyle(() => {
    const f = Math.max(0, fly.value - 2 * K.AFTERIMAGE_LAG);
    return {
      opacity: interpolate(fly.value, [0, 0.15, 0.85, 1], [0, K.AFTERIMAGE_OPACITY[1], K.AFTERIMAGE_OPACITY[1], 0], Extrapolation.CLAMP),
      transform: boltTransform(f, wind.value),
    };
  });
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: K.GLOW * bloom.value,
    transform: [{ scale: 0.55 + 0.45 * bloom.value }],
  }));

  const boltBox = { left: square.x, top: square.y, width: square.width, height: square.height };
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none" onLayout={onFirstLayout}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bg }, bgStyle]} />
      {flight ? (
        <Animated.View style={[styles.abs, { left: ex - K.BLOOM / 2, top: ey - K.BLOOM / 2, width: K.BLOOM, height: K.BLOOM }, bloomStyle]}>
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
      {flight && K.AFTERIMAGES >= 2 ? <Animated.View style={[styles.abs, boltBox, ghost1]}><Bolt id="introG1" /></Animated.View> : null}
      {flight && K.AFTERIMAGES >= 1 ? <Animated.View style={[styles.abs, boltBox, ghost0]}><Bolt id="introG0" /></Animated.View> : null}
      <Animated.View style={[styles.abs, boltBox, boltStyle]}><Bolt id="introBolt" /></Animated.View>
      {flight ? <Sparks at={flight.ends.top} impact={impact} seed={1} /> : null}
      {flight ? <Sparks at={flight.ends.bottom} impact={impact} seed={2} /> : null}
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

function Sparks({ at, impact, seed }: { at: Point; impact: Animated.SharedValue<number>; seed: number }) {
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

function Streak({ at, impact, angle, reach, length, color }: {
  at: Point; impact: Animated.SharedValue<number>; angle: number; reach: number; length: number; color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, impact.value / STREAK_LIFE);
    const out = 1 - (1 - t) * (1 - t); // ease out
    const d = reach * out;
    return {
      opacity: impact.value > 0 && t < 1 ? 1 - t : 0,
      transform: [
        { translateX: Math.cos(angle) * d },
        { translateY: Math.sin(angle) * d },
        { rotate: `${angle}rad` },
        { scaleX: 1 - 0.7 * t },
      ],
    };
  });
  return <Animated.View style={[styles.abs, { left: at.x - length / 2, top: at.y - 1, width: length, height: 2, borderRadius: 1, backgroundColor: color }, style]} />;
}

function Ember({ at, impact, angle, reach, size, color }: {
  at: Point; impact: Animated.SharedValue<number>; angle: number; reach: number; size: number; color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = impact.value;
    const out = 1 - (1 - t) * (1 - t);
    return {
      opacity: t > 0 && t < 1 ? 1 - t * t : 0,
      transform: [
        { translateX: Math.cos(angle) * reach * out },
        { translateY: Math.sin(angle) * reach * out + 16 * t * t }, // a little gravity
      ],
    };
  });
  return <Animated.View style={[styles.abs, { left: at.x - size / 2, top: at.y - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  layer: { zIndex: 1000, elevation: 1000 },
  abs: { position: 'absolute' },
});
