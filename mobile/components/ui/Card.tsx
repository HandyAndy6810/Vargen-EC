import { View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/theme/tokens';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={[{
        backgroundColor: c.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.lineSoft,
        padding: space.lg,
      }, style]}
    >
      {children}
    </View>
  );
}
