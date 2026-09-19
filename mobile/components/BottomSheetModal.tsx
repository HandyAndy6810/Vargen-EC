import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated, Easing, Modal, TouchableWithoutFeedback, StyleSheet,
  type ViewStyle, type StyleProp,
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
 * The sheet's own height is measured and used as the travel distance, which keeps
 * a short menu from starting far off-screen and arriving late. Until it has been
 * measured, a generous default stands in for one frame.
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  sheetStyle,
  /** Dim level behind the sheet. */
  dim = 0.45,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  dim?: number;
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
      <Animated.View
        onLayout={e => setSheetH(e.nativeEvent.layout.height)}
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0 },
          sheetStyle,
          {
            transform: [{
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [sheetH || 420, 0],
              }),
            }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}
