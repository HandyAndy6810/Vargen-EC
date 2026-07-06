import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { radius, type as t } from '@/theme/tokens';

export function Pill({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: bg ?? c.paperDeep,
      }}
    >
      <Text
        style={{
          fontSize: t.caption,
          fontFamily: 'Manrope_800ExtraBold',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: color ?? c.mutedHi,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
