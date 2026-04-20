import React from 'react';
import { View, Text } from 'react-native';

type Status = 'draft' | 'sent' | 'accepted' | 'rejected' | 'overdue' |
              'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' |
              'paid' | 'unpaid' | 'partial';

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string }> = {
  draft:       { label: 'Draft',       bg: '#f0ece4', fg: '#57534e' },
  sent:        { label: 'Sent',        bg: '#dbeafe', fg: '#1d4ed8' },
  accepted:    { label: 'Accepted',    bg: '#dcfce7', fg: '#15803d' },
  rejected:    { label: 'Declined',    bg: '#fee2e2', fg: '#b91c1c' },
  overdue:     { label: 'Overdue',     bg: '#fef3c7', fg: '#b45309' },
  pending:     { label: 'Pending',     bg: '#fef3c7', fg: '#b45309' },
  confirmed:   { label: 'Confirmed',   bg: '#dbeafe', fg: '#1d4ed8' },
  in_progress: { label: 'In Progress', bg: '#ffedd5', fg: '#c2410c' },
  completed:   { label: 'Completed',   bg: '#dcfce7', fg: '#15803d' },
  cancelled:   { label: 'Cancelled',   bg: '#fee2e2', fg: '#b91c1c' },
  paid:        { label: 'Paid',        bg: '#dcfce7', fg: '#15803d' },
  unpaid:      { label: 'Unpaid',      bg: '#fef3c7', fg: '#b45309' },
  partial:     { label: 'Partial',     bg: '#dbeafe', fg: '#1d4ed8' },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#f0ece4', fg: '#57534e' };
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: cfg.fg, letterSpacing: 0.2 }}>
        {cfg.label}
      </Text>
    </View>
  );
}
