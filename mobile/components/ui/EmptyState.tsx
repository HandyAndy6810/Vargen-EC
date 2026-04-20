import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: '#f0ece4',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={28} color="#a8a29e" />
      </View>
      <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#1c1917', textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: '#78716c', textAlign: 'center', marginTop: 6 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
