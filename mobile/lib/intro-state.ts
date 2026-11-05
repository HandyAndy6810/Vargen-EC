import { Animated } from 'react-native';
import type { Rect } from '@shared/intro-geometry';

/**
 * Shared state between the intro overlay (components/IntroOverlay.tsx) and the
 * Zap button on Home (components/SplitActionButton.tsx).
 *
 * A cold start is this JS bundle loading: a warm resume (back from the
 * background) keeps the bundle in memory, so the intro never runs again until
 * the app is killed. In dev builds, replayIntro() runs it again.
 */

/** The intro has not run in this process yet. */
let pending = true;
export const introPending = () => pending;
/** The intro is over (finished, skipped or failed): the button goes back to rest. */
export const markIntroDone = () => {
  halvesOffset.setValue(0); buttonScale.setValue(1); buttonShake.setValue(0);
  pending = false; notify();
};

/**
 * The Zap button's halves, driven by the overlay (React Native's Animated, on
 * the native driver): how far each half sits from home (px; left goes left,
 * right goes right), the button's scale and vertical shake. At rest: 0, 1, 0.
 *
 * Not reanimated: on React Native 0.81, reanimated 3.16 throws as soon as it
 * is imported (its Animated.Text rejects RN's function-component Text), which
 * crashed build 3 at launch. Nothing in the app may import it; CI checks.
 */
export const halvesOffset = new Animated.Value(0);
export const buttonScale = new Animated.Value(1);
export const buttonShake = new Animated.Value(0);

/**
 * The Zap button's position on screen. Home's button registers a measurer on
 * mount; the overlay asks it (and asks again every POLL_MS) until it has a
 * real size or the wait runs out.
 */
let measurer: (() => void) | null = null;
const waiters = new Set<(r: Rect) => void>();
const POLL_MS = 100;
export function registerIntroMeasurer(fn: () => void) {
  measurer = fn;
  return () => { if (measurer === fn) measurer = null; };
}
export function setIntroTarget(r: Rect | null) {
  if (r) waiters.forEach((w) => w(r));
}
/** The button's rect, as soon as it can be measured, or null after timeoutMs. */
export function waitForIntroTarget(timeoutMs: number): Promise<Rect | null> {
  return new Promise((resolve) => {
    let poll: ReturnType<typeof setInterval> | null = null;
    const done = (r: Rect | null) => {
      waiters.delete(onTarget); clearTimeout(timer); if (poll) clearInterval(poll); resolve(r);
    };
    const onTarget = (r: Rect) => done(r);
    waiters.add(onTarget);
    const timer = setTimeout(() => done(null), timeoutMs);
    measurer?.();
    poll = setInterval(() => measurer?.(), POLL_MS);
  });
}

// Listeners (the overlay host) re-render when the intro starts or ends.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
export function subscribeIntro(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/** Dev builds only: run the intro again without killing the app. */
export function replayIntro() {
  if (!__DEV__) return;
  pending = true;
  notify();
}
