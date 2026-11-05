/**
 * Geometry for the cold start intro (mobile/components/IntroOverlay.tsx): where
 * the splash bolt starts, where the Zap button's gap is, and the curved path
 * between them. Pure, so it is tested (intro-geometry.test.ts). No imports.
 *
 * Two bolts, one shape:
 *  - The splash bolt: the icon's bolt (1024 space, box 314.4..709.6 x
 *    102.4..921.6, centred at 512,512) drawn in a square of SPLASH_IMAGE_WIDTH
 *    centred on the screen. Its height is 819.2/1024 of that square.
 *  - The Zap gap: components/SplitActionButton draws the same six points in a
 *    viewBox "0 -22 2000 132" with preserveAspectRatio "xMidYMid slice", so
 *    one viewBox unit is height/132 px. The gap runs from the top tip (y -14)
 *    to the bottom tip (y 102): 116 units tall, centred at x 1000 and y 44,
 *    which is exactly the middle of the button.
 */

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

/** Icon-space bolt height over the 1024 square (the 0.8-scaled Sunset bolt). */
export const BOLT_HEIGHT_RATIO = 819.2 / 1024;
/** Zap gap height in the button's viewBox units, and the viewBox height. */
export const GAP_UNITS = 116;
export const BUTTON_VB_HEIGHT = 132;

/** The splash bolt's square: SPLASH_IMAGE_WIDTH points, centred on the screen. */
export function splashSquare(screen: { width: number; height: number }, imageWidth: number): Rect {
  return { x: (screen.width - imageWidth) / 2, y: (screen.height - imageWidth) / 2, width: imageWidth, height: imageWidth };
}

/**
 * Where the bolt must end up: the centre of the Zap button's gap, and the scale
 * (relative to the splash bolt) that makes it exactly the gap's size.
 */
export function gapTarget(button: Rect, imageWidth: number): { center: Point; scale: number; gapHeight: number } {
  const unit = button.height / BUTTON_VB_HEIGHT;
  const gapHeight = GAP_UNITS * unit;
  const splashBoltHeight = imageWidth * BOLT_HEIGHT_RATIO;
  return {
    center: { x: button.x + button.width / 2, y: button.y + button.height / 2 },
    scale: gapHeight / splashBoltHeight,
    gapHeight,
  };
}

/** The two ends of the gap (top and bottom tips), where the sparks fly from. */
export function gapEnds(button: Rect): { top: Point; bottom: Point } {
  const unit = button.height / BUTTON_VB_HEIGHT;
  const cx = button.x + button.width / 2;
  // Tips at viewBox (1008,-14) and (992,102); the viewBox's x 1000 is the centre.
  return {
    top: { x: cx + 8 * unit, y: button.y + (-14 + 22) * unit },
    bottom: { x: cx - 8 * unit, y: button.y + (102 + 22) * unit },
  };
}

/**
 * The control point of a quadratic curve from a to b that bows out sideways by
 * `arc` times the straight distance (0 = a straight line). Bows to the left of
 * the direction of travel, so a bolt dropping down the screen swings out
 * before snapping in.
 */
export function arcControl(a: Point, b: Point, arc: number): Point {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Unit normal (rotate the direction 90 degrees anticlockwise).
  return { x: mx + (-dy / len) * arc * len, y: my + (dx / len) * arc * len };
}

/** A point on the quadratic curve a → c → b at t (0..1; may overshoot past 1). */
export function quadAt(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}
