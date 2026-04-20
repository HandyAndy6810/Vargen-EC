import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#e7e5e4',
          padding: 16,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
