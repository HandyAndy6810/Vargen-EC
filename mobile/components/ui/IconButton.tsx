import { TouchableOpacity } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { radius, HIT } from '@/theme/tokens';

// label is required — icon-only controls are unnameable to screen readers without it
export function IconButton({ children, onPress, label, accent }: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  accent?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: HIT,
        height: HIT,
        borderRadius: radius.sm,
        backgroundColor: accent ? c.orange : c.card,
        borderWidth: accent ? 0 : 1,
        borderColor: c.lineSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
