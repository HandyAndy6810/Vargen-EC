import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

interface SectionHeaderProps extends ViewProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action, style, ...rest }: SectionHeaderProps) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
        style,
      ]}
      {...rest}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: 'Manrope_800ExtraBold',
          color: '#a8a29e',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
