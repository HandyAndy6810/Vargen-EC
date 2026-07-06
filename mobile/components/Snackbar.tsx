import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { setToastListener, type ToastPayload } from '@/lib/toast';

/**
 * Non-blocking toast host. Mount once in the root layout. toast() calls from
 * anywhere in the app slide this up from the bottom and auto-dismiss — no OK
 * button to tap, no blocked JS thread (the old toast was Alert.alert).
 */
export function Snackbar() {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(80)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setToastListener((t) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setCurrent(t);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 250 }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(translateY, { toValue: 80, duration: 180, useNativeDriver: true }).start(() => setCurrent(null));
      }, 2600);
    });
    return () => {
      setToastListener(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!current) return null;
  const destructive = current.variant === 'destructive';

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 90,
        transform: [{ translateY }],
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: destructive ? c.red : c.ink,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <Text style={{ fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.paper }}>
          {current.title}
        </Text>
        {current.description ? (
          <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.paper, opacity: 0.8, marginTop: 2 }}>
            {current.description}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}
