import { Platform, type ViewStyle } from 'react-native';
import type { Colors } from '@/hooks/use-theme';

/**
 * The "Rim" tile used across Home: a translucent fill, a brighter top edge and
 * a soft shadow. React Native on the old architecture has no inset shadow, so
 * the lighter top border IS the rim — don't try to fake an inner glow.
 *
 * Android gets no elevation: elevation shadows show through translucent views
 * and look muddy. Row dividers inside tiles keep using c.lineSoft.
 */
export function rimTile(c: Colors, isDark: boolean, fill?: string): ViewStyle {
  return {
    backgroundColor: fill ?? c.tile,
    borderWidth: 1,
    borderColor: c.tileEdge,
    borderTopColor: c.tileRim,
    borderRadius: 22,
    ...Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#141416',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        shadowOpacity: isDark ? 0 : 0.06,
      },
      default: { elevation: 0 },
    }),
  };
}
