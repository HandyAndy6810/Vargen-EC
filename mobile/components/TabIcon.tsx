import { Platform } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';

/**
 * SF Symbols on iOS, lucide everywhere else.
 *
 * SF Symbols are the icons an iPhone owner has been reading for years, and they
 * carry things a drawn set can't: they weight-match the system font, they ship the
 * filled/outline pair Apple's own tab bars alternate between, and they render at the
 * exact optical size iOS expects. Lucide stays as the Android fallback, where SF
 * Symbols aren't available and would be the wrong idiom anyway.
 *
 * The filled variant on the selected tab and the outline on the rest is the iOS
 * convention — it's how the system tells you where you are without relying on colour
 * alone, which also helps anyone who can't pick the orange out.
 */
export type TabIconSpec = {
  /** SF Symbol shown when the tab is not selected. */
  symbol: SymbolViewProps['name'];
  /** SF Symbol shown when it is. Usually the .fill variant of the same glyph. */
  symbolActive: SymbolViewProps['name'];
  /** Android/web fallback. */
  Fallback: LucideIcon;
};

export function TabIcon({
  spec,
  focused,
  color,
  size = 26,
}: {
  spec: TabIconSpec;
  focused: boolean;
  color: string;
  size?: number;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={focused ? spec.symbolActive : spec.symbol}
        size={size}
        tintColor={color}
        // Matches the weight of the label beneath it, the way the system pairs them.
        weight={focused ? 'semibold' : 'regular'}
        resizeMode="scaleAspectFit"
        // If a symbol name is ever wrong or missing on an older iOS, draw the lucide
        // icon rather than leaving a hole in the tab bar.
        fallback={<spec.Fallback size={size - 2} color={color} strokeWidth={2} />}
      />
    );
  }
  return <spec.Fallback size={size - 2} color={color} strokeWidth={2} />;
}
