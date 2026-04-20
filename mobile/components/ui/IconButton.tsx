import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';

interface IconButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  size?: number;
}

export function IconButton({ children, size = 40, style, ...rest }: IconButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: '#f0ece4',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}
