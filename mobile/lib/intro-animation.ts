import { Easing } from 'react-native';

/**
 * Every setting of the cold start intro (components/IntroOverlay.tsx), in one
 * place so they can be tuned. Values marked LOCKED were chosen on 23 Sep 2026
 * (start frame updated for Sunset on 5 Nov 2026); the rest are choices made
 * while building it.
 *
 * Timeline (ms from the native splash hiding):
 *     0  the overlay shows the splash frame exactly; the Zap halves sit apart
 *     0 → 150      wind up: the bolt draws back a little
 *     60 → 420     the splash background fades, revealing Home behind
 *   150 → 850      flight along a curved path, spinning, with 2 afterimages
 *   680 → 850      the halves clamp in (they reach the bolt as it lands)
 *   850            impact: pulse, thud, sparks, bloom
 *   850 → 1170     the solid bolt crossfades into the button's real gap
 *  ~1400          sparks finished, overlay removed
 */

/** LOCKED. Strike / sheen across the bolt: off. */
export const STRIKE = false;

/** LOCKED. Peak opacity of the impact bloom (the warm glow at the gap). */
export const GLOW = 0.75;

/** LOCKED. Wind up before the flight (ms). The bolt eases back to WINDUP_SCALE. */
export const WINDUP_MS = 150;
/** Choice. How far the bolt draws back in the wind up (scale). */
export const WINDUP_SCALE = 0.94;

/** LOCKED. Flight from the splash position to the gap (ms). */
export const FLIGHT_MS = 700;

/**
 * LOCKED (shape chosen here). "Whip": a fast snap with an overshoot feel.
 * A cubic bezier whose second control point goes past 1, so the bolt shoots
 * slightly beyond the gap (about 6% of the path) and settles back into it.
 * Tune the four numbers; Easing.bezier(x1, y1, x2, y2) (React Native's own
 * Easing: the intro runs on Animated, never reanimated; see IntroOverlay.tsx).
 */
export const WHIP_BEZIER = [0.62, 0.0, 0.14, 1.22] as const;
export const WHIP = Easing.bezier(...WHIP_BEZIER);

/** LOCKED. Curvature of the flight path: sideways bow as a fraction of the distance. */
export const ARC = 0.34;

/** LOCKED. Rotation over the flight (degrees): starts at -SPIN, ends upright. */
export const SPIN = 12;

/** LOCKED. Trailing copies of the bolt during the flight. */
export const AFTERIMAGES = 2;
/** Choice. How far behind each afterimage runs (fraction of the flight), and its opacity. */
export const AFTERIMAGE_LAG = 0.07;
export const AFTERIMAGE_OPACITY = [0.32, 0.16];

/** LOCKED. How far each Zap half starts from home (px), and how long it takes to clamp in. */
export const HALVES_TRAVEL = 80;
export const HALVES_MS = 170;

/** LOCKED. Button scale pulse on impact (1.5%). */
export const PULSE = 0.015;
/** Choice. Pulse out and back (ms). */
export const PULSE_MS = 180;

/** LOCKED. Shake on impact (px). */
export const THUD = 1.5;
/** Choice. Each shake step (ms); three steps: down, up, settle. */
export const THUD_STEP_MS = 45;

/** LOCKED. Crossfade from the solid bolt to the button's real gap (ms). */
export const BOLT_FADE_MS = 320;

/** LOCKED. Sparks per end of the bolt (top tip and bottom tip). */
export const SPARK_STREAKS = 9;
export const SPARK_EMBERS = 5;
/** Choice. Streak and ember lifetimes (ms), reach (px) and size. */
export const STREAK_MS = 360;
export const EMBER_MS = 520;
export const STREAK_REACH = [26, 58] as const;   // min, max distance (px)
export const STREAK_LENGTH = [10, 20] as const;  // min, max length (px)
export const EMBER_REACH = [14, 34] as const;
export const EMBER_SIZE = [2.5, 4] as const;
export const SPARK_COLORS = ['#FFE3A3', '#FFC14D', '#F26A2A'] as const;

/** LOCKED. Diameter of the impact bloom (px). */
export const BLOOM = 260;
/** Choice. Bloom rise and fall (ms). */
export const BLOOM_IN_MS = 90;
export const BLOOM_OUT_MS = 420;

/** Choice. The splash background fades out over this window (ms from the start). */
export const BG_FADE_FROM_MS = 60;
export const BG_FADE_MS = 360;

/** Brief. The plain fade used when the intro is skipped (Reduce Motion: 200 ms). */
export const SKIP_FADE_MS = 200;

/**
 * Brief. Give up waiting for the Zap button after this long and just fade (ms),
 * counted from the navigator's first screen rendering (until then the overlay
 * is the splash, which the brief keeps up until Home's first layout).
 */
export const TARGET_TIMEOUT_MS = 500;
/** Choice. Never wait longer than this for the navigator itself (ms). */
export const NAV_READY_CAP_MS = 2000;
