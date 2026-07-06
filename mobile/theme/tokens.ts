// Design tokens — the single source for spacing, type, radius, and hit targets.
// Colors live in hooks/use-theme.ts (light + dark palettes).

export const space = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40,
} as const;

export const type = {
  caption: 11, small: 12, body: 13, bodyLg: 15, title: 17, heading: 20, display: 24, hero: 30,
} as const;

export const radius = {
  sm: 10, md: 14, lg: 18, xl: 22, pill: 999,
} as const;

// Minimum touch target (gloved thumbs, one-handed use)
export const HIT = 44;
