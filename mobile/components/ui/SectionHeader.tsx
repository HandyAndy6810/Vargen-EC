import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { type as t, space } from '@/theme/tokens';

export function SectionHeader({ title, actionLabel, onAction }: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
      <Text style={{ fontSize: t.title, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3 }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={{ fontSize: t.small, fontFamily: 'Manrope_800ExtraBold', color: c.orange }}>
            {actionLabel} →
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
