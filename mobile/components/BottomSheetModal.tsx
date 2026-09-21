import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, Platform,
  TouchableWithoutFeedback, StyleSheet, type ViewStyle, type StyleProp,
} from 'react-native';

/**
 * A sheet that rises from the bottom over a dimmed page.
 *
 * React Native's own `animationType="slide"` animates the WHOLE modal, backdrop
 * included — so the dim layer travelled up the screen as a translucent box rather
 * than fading in behind the sheet. It read as a rendering fault, and every bottom
 * sheet in the app had it.
 *
 * The two parts have to move differently: the backdrop fades in place, the sheet
 * slides. So the modal itself is given no animation and both are driven here.
 *
 * Layered deliberately — the dim is painted first and ignores touches, the backdrop
 * above it catches a tap to dismiss, and the sheet sits on top inside a
 * KeyboardAvoidingView that is `box-none` so taps beside the sheet still reach the
 * backdrop. That last part is why the sheet is laid out with flex rather than
 * positioned absolutely: an absolutely positioned sheet cannot be lifted clear of
 * the keyboard, and several of these sheets have text fields in them.
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  sheetStyle,
  /** Dim level behind the sheet. */
  dim = 0.45,
  /** Lift the sheet clear of the keyboard. Only needed when it holds an input. */
  avoidKeyboard = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  dim?: number;
  avoidKeyboard?: boolean;
}) {
  // Kept mounted until the closing animation finishes — unmounting on `visible`
  // alone would cut the exit off and make the sheet vanish rather than leave.
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        // Decelerating: fast off the mark, easing into place, the way a sheet
        // pulled up by a finger would settle.
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180, // Leaving is quicker than arriving; waiting to dismiss feels slow.
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  if (!mounted) return null;

  const sheet = (
    <Animated.View
      onLayout={e => setSheetH(e.nativeEvent.layout.height)}
      style={[
        sheetStyle,
        {
          transform: [{
            // Its own measured height, so a short menu does not start far off-screen
            // and arrive late. The fallback covers the single frame before layout.
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [sheetH || 420, 0] }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, dim] }) },
        ]}
        pointerEvents="none"
      />
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close">
        <Animated.View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.stack}
          pointerEvents="box-none"
        >
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        <Animated.View style={styles.stack} pointerEvents="box-none">{sheet}</Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  stack: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
});
