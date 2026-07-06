import { View, Text } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { type as t, space } from '@/theme/tokens';
import { PrimaryButton } from './PrimaryButton';

export function EmptyState({ icon, title, message, ctaLabel, onCta }: {
  icon?: ReactNode;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xxl, gap: space.sm }}>
      {icon}
      <Text style={{ fontSize: t.bodyLg, fontFamily: 'Manrope_800ExtraBold', color: c.ink, textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text style={{ fontSize: t.body, fontFamily: 'Manrope_500Medium', color: c.muted, textAlign: 'center', lineHeight: 20, maxWidth: 260 }}>
          {message}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <View style={{ marginTop: space.md, alignSelf: 'stretch' }}>
          <PrimaryButton label={ctaLabel} onPress={onCta} />
        </View>
      ) : null}
    </View>
  );
}
