/**
 * The Sunset bolt (app icon, splash, login mark, intro animation), in the
 * icon's 1024 coordinate space. Source of truth: assets/brand/icon-sunset.svg;
 * keep these in step with it (scripts/render-brand-icons.mjs reads the SVG).
 */
export const BOLT_POINTS = '568.8,102.4 314.4,582.4 512,582.4 455.2,921.6 709.6,441.6 512,441.6';

/** The bolt's own bounding box in the 1024 space; it is centred at (512, 512). */
export const BOLT_BOX = { x: 314.4, y: 102.4, width: 395.2, height: 819.2 } as const;

/** Corner to corner across the bolt's bounding box. */
export const BOLT_GRADIENT = [
  { offset: 0, color: '#FFC14D' },
  { offset: 0.5, color: '#F26A2A' },
  { offset: 1, color: '#E0361E' },
] as const;

/** The icon's background ramp, light and dark. */
export const ICON_BACKGROUND = {
  light: ['#FFFFFF', '#F0F0EE'],
  dark: ['#2A2B30', '#141416'],
} as const;

/**
 * The native splash (app.json, expo-splash-screen): splash-icon.png is the
 * bolt on a transparent 1024 canvas, shown SPLASH_IMAGE_WIDTH points wide and
 * centred on the screen. The intro animation's first frame draws the same.
 */
export const SPLASH_IMAGE_WIDTH = 200;
export const SPLASH_BACKGROUND = { light: '#FFFFFF', dark: '#141416' } as const;
