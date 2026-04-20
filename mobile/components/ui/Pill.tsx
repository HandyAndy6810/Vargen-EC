import React from 'react';
import { TouchableOpacity, Text, type TouchableOpacityProps } from 'react-native';

interface PillProps extends TouchableOpacityProps {
  label: string;
  active?: boolean;
  count?: number;
}

export function Pill({ label, active = false, count, style, ...rest }: PillProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: active ? '#1c1917' : '#f0ece4',
          borderWidth: 1,
          borderColor: active ? '#1c1917' : 'transparent',
        },
        style,
      ]}
      {...rest}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'Manrope_700Bold',
          color: active ? '#ffffff' : '#57534e',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'Manrope_700Bold',
            color: active ? 'rgba(255,255,255,0.7)' : '#a8a29e',
          }}
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
}
