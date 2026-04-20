import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
}

export function PrimaryButton({ label, loading, style, disabled, ...rest }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: '#ea580c',
          borderRadius: 14,
          paddingVertical: 15,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.2 }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
