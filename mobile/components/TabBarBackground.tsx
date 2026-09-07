import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/use-theme';

/**
 * The material behind the tab bar: a blur on iOS, a solid surface elsewhere.
 *
 * Apple's real Liquid Glass was tried here and had to come out. `expo-glass-effect`
 * overrides `mountChildComponentView` / `unmountChildComponentView`, which
 * expo-modules-core only defines under `#if RCT_NEW_ARCH_ENABLED`, and it wraps them
 * in no guard of its own — so on the legacy architecture the superclass has no such
 * method and the Swift compile fails outright. The package requires the New
 * Architecture, and this app is deliberately on the legacy one (see CLAUDE.md).
 *
 * To restore it if the app ever moves to the New Architecture: reinstall
 * expo-glass-effect, and put this branch back above the blur —
 *
 *   if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
 *     return <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />;
 *   }
 *
 * leaving it untinted, so the material picks up whatever passes beneath it.
 * isLiquidGlassAvailable() must stay as a runtime check rather than a version guess:
 * some iOS 26 betas shipped without the API and calling into it crashes.
 */
export function TabBarBackground() {
  const { colors: c, isDark } = useTheme();

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

  // Android and web: a fake frosted panel there looks like a mistake, not a style.
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper }]} />;
}
