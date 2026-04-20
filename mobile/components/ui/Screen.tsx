import React from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  padBottom?: boolean;
}

export function Screen({ children, scroll = true, padBottom = true, style, ...rest }: ScreenProps) {
  const inner = (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#faf9f7' }} edges={['top']}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ paddingBottom: padBottom ? 120 : 24 }, style]}
          {...rest}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
  return inner;
}
