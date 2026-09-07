import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { Trash2 } from 'lucide-react-native';

const SWIPE_W = 104;
const DELETE_INSET = 8;

/**
 * Drag a line item left to reveal Delete. Uses PanResponder and the built-in
 * Animated API — the same pair the rest of the app animates with — and only claims
 * the gesture once movement is clearly horizontal, so vertical scrolling still works.
 */
export function SwipeableRow({
  children,
  onDelete,
  bg,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  bg: string;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);

  const slide = (to: number) => {
    open.current = to !== 0;
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        const base = open.current ? -SWIPE_W : 0;
        x.setValue(Math.min(0, Math.max(-SWIPE_W, base + g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        const base = open.current ? -SWIPE_W : 0;
        slide(base + g.dx < -SWIPE_W / 2 ? -SWIPE_W : 0);
      },
    })
  ).current;

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        style={[sw.deleteZone, { width: SWIPE_W - DELETE_INSET * 2, right: DELETE_INSET }]}
        activeOpacity={0.85}
        onPress={() => { slide(0); onDelete(); }}
        accessibilityRole="button"
        accessibilityLabel="Delete line item"
      >
        <Trash2 size={18} color="#fff" strokeWidth={2.2} />
        <Text style={sw.deleteText}>Delete</Text>
      </TouchableOpacity>
      <Animated.View style={{ transform: [{ translateX: x }], backgroundColor: bg }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  // A rounded pill inset from the row edges rather than a full-bleed red block —
  // it reads as a button you press, not as the row bleeding open.
  deleteZone: {
    position: 'absolute', top: 6, bottom: 6,
    backgroundColor: '#d23b3b', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  deleteText: { fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});

