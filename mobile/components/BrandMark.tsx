import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * The "Split" brand mark: the app icon in miniature (orange left, graphite
 * right, a light grey bolt between them — the Zap button's bolt, scaled), with
 * the lowercase "vargen" wordmark. Source: assets/brand/icon-split.svg.
 */
export function BrandMark({ size = 42, color, showWordmark = true }: {
  size?: number;
  /** Wordmark colour. Defaults to white for the dark login hero. */
  color?: string;
  showWordmark?: boolean;
}) {
  return (
    <View style={s.row}>
      <View style={{ width: size, height: size, borderRadius: size * 0.2237, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox="0 0 1024 1024">
          <Rect width={1024} height={1024} fill="#F2F2F0" />
          <Path d="M 0,0 L 583,0 L 265,600 L 512,600 L 441,1024 L 0,1024 Z" fill="#F26A2A" />
          <Path d="M 583,0 L 1024,0 L 1024,1024 L 441,1024 L 759,424 L 512,424 Z" fill="#1C1D21" />
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
