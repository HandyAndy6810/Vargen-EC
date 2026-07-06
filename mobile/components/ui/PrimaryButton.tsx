import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { radius, type as t, HIT } from '@/theme/tokens';

export function PrimaryButton({ label, onPress, disabled, loading, destructive }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        minHeight: HIT + 10,
        borderRadius: radius.lg,
        backgroundColor: destructive ? c.red : c.orange,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 20,
      }}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={{ fontSize: t.bodyLg, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>{label}</Text>}
    </TouchableOpacity>
  );
}
