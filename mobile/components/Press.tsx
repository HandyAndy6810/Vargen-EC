import { useState } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A Pressable with a plain style, plus `pressedStyle` while it's held.
 *
 * Use this instead of `<Pressable style={({ pressed }) => ...}>`. NativeWind
 * (react-native-css-interop) wraps Pressable on iOS and Android and spreads an
 * inline style into an object: a style FUNCTION becomes `{}`, so the component
 * draws with no style at all. On the web it works, which is how the Profile and
 * Settings rows shipped as unpadded columns on the phone (Nov 2026). CI fails on
 * `style={({` in app code.
 */
export function Press({
  style, pressedStyle, onPressIn, onPressOut, ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle> }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => { if (pressedStyle) setPressed(true); onPressIn?.(e); }}
      onPressOut={(e) => { if (pressedStyle) setPressed(false); onPressOut?.(e); }}
      style={StyleSheet.flatten([style, pressed && pressedStyle])}
    />
  );
}
