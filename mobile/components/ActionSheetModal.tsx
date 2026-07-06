import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

export interface SheetAction {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

/**
 * Bottom-sheet action menu. Replaces multi-button Alert.alert menus, which
 * silently drop buttons past 3 on Android and are complete no-ops on web.
 */
export function ActionSheetModal({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close menu">
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>
      <View style={s.sheet}>
        <View style={s.handle} />
        {title ? <Text style={s.title}>{title}</Text> : null}
        {actions.map((a, i) => (
          <TouchableOpacity
            key={a.label}
            style={[s.row, i > 0 && s.rowBorder]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => {
              onClose();
              // Let the modal dismiss before the action runs (some actions open other modals/alerts)
              setTimeout(a.onPress, 50);
            }}
          >
            {a.icon}
            <Text style={[s.rowText, a.destructive && s.rowTextDestructive]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(20,19,16,0.15)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(20,19,16,0.55)',
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 8,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(20,19,16,0.08)',
  },
  rowText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#141310',
  },
  rowTextDestructive: {
    color: '#d23b3b',
  },
  cancelBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(20,19,16,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#141310',
  },
});
