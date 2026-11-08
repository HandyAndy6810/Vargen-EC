import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The floating tab bar (app/(tabs)/_layout.tsx): its height, and how far it sits off the bottom. */
export const TAB_BAR_H = 62;
export const tabBarBottom = (insetBottom: number) => (insetBottom > 0 ? insetBottom : 10) + 2;

/**
 * Bottom padding for a tab screen's scroll content, so the last item can scroll
 * fully clear of the floating tab bar: its height, its gap off the bottom (the
 * home indicator inset) and a margin.
 */
export function useTabBarSpace(margin = 24) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_H + tabBarBottom(insets.bottom) + margin;
}
