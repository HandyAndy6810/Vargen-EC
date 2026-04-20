import React from 'react';
import { TouchableOpacity, Text, type TouchableOpacityProps } from 'react-native';

interface SecondaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function SecondaryButton({ label, style, ...rest }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        {
          backgroundColor: '#f0ece4',
          borderRadius: 14,
          paddingVertical: 15,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      {...rest}
    >
      <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#1c1917', letterSpacing: -0.2 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
