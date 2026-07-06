import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useMemo, type ReactNode } from 'react';
import { useTheme, type Colors } from '@/hooks/use-theme';

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
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
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

const makeStyles = (c: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: c.card,
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
    backgroundColor: c.lineMid,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.muted,
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
    borderTopColor: c.lineSoft,
  },
  rowText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  rowTextDestructive: {
    color: c.red,
  },
  cancelBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    backgroundColor: c.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
});
