import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Polygon } from 'react-native-svg';
import { BOLT_POINTS, BOLT_GRADIENT, ICON_BACKGROUND } from '@/lib/brand-bolt';

/**
 * The "Sunset" brand mark: the app icon in miniature (the gradient bolt on the
 * light tile), with the lowercase "vargen" wordmark. Source:
 * assets/brand/icon-sunset.svg. The tile is light in both themes, as the icon
 * is, so the mark reads on the dark login hero and on a light page alike; the
 * wordmark colour is the caller's (white by default for the dark hero).
 */
export function BrandMark({ size = 42, color, showWordmark = true }: {
  size?: number;
  /** Wordmark colour. Defaults to white for the dark login hero. */
  color?: string;
  showWordmark?: boolean;
}) {
  return (
    <View style={s.row} accessibilityRole="image" accessibilityLabel="Vargen">
      <View style={{ width: size, height: size, borderRadius: size * 0.2237, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox="0 0 1024 1024">
          <Defs>
            <LinearGradient id="bmBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={ICON_BACKGROUND.light[0]} />
              <Stop offset="1" stopColor={ICON_BACKGROUND.light[1]} />
            </LinearGradient>
            <LinearGradient id="bmBolt" x1="0" y1="0" x2="1" y2="1">
              {BOLT_GRADIENT.map((st) => <Stop key={st.offset} offset={st.offset} stopColor={st.color} />)}
            </LinearGradient>
          </Defs>
          <Rect width={1024} height={1024} fill="url(#bmBg)" />
          <Polygon points={BOLT_POINTS} fill="url(#bmBolt)" />
        </Svg>
      </View>
      {showWordmark ? (
        <Text style={[s.wordmark, { fontSize: size * 0.62, color: color ?? '#fff' } as TextStyle]}>vargen</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: 'HostGrotesk_700Bold', letterSpacing: -2 },
});
