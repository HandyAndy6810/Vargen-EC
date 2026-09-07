import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '@/hooks/use-theme';

/**
 * The material behind the tab bar, in three tiers, best first.
 *
 * 1. iOS 26 with Liquid Glass compiled in — Apple's real material, the same one the
 *    system apps use. It refracts and reacts to what scrolls beneath it, which no
 *    blur can imitate.
 * 2. Any other iOS — a blur, which is the honest approximation and has been
 *    available since long before iOS 26.
 * 3. Android and web — a solid surface. A fake frosted panel there looks like a
 *    mistake rather than a style.
 *
 * isLiquidGlassAvailable() is a real runtime check, not a version guess: some iOS 26
 * betas shipped without the API and calling into it crashes. It also returns false
 * when the app was compiled with an older Xcode, which is why the build image matters
 * as much as the phone does.
 */
export function TabBarBackground() {
  const { colors: c, isDark } = useTheme();

  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle="regular"
        // No tint: the point of the material is that it picks up the colour of
        // whatever passes under it. Tinting it orange would flatten it back into a
        // coloured panel.
      />
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView intensity={isDark ? 40 : 60} tint={c.blurTint} style={StyleSheet.absoluteFill} />
        {/* Blur alone leaves labels swimming over busy content — a thin wash of the
            page colour holds the contrast without reading as a solid bar. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(13,14,17,0.55)' : 'rgba(255,251,248,0.6)' },
          ]}
        />
      </View>
    );
  }

  return <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper }]} />;
}

/** True when the bar is see-through, so the caller can soften its border to match. */
export function tabBarIsTranslucent(): boolean {
  return Platform.OS === 'ios';
}
