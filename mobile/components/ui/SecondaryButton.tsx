import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { radius, type as t, HIT } from '@/theme/tokens';

export function SecondaryButton({ label, onPress, disabled, loading }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        minHeight: HIT + 10,
        borderRadius: radius.lg,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.lineMid,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 20,
      }}
    >
      {loading
        ? <ActivityIndicator color={c.orange} />
        : <Text style={{ fontSize: t.body, fontFamily: 'Manrope_700Bold', color: c.ink }}>{label}</Text>}
    </TouchableOpacity>
  );
}
