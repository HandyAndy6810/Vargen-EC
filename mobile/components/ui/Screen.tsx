import { View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors: c } = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: c.paper }, style]} edges={['top']}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
