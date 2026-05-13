import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export type UserSettings = {
  businessName: string;
  abn: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  tradeType: string;
  labourRate: number;
  markupPercent: number;
  callOutFee: number;
  callOutFeeEnabled: boolean;
  includeGST: boolean;
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountName: string;
  paymentTermsDays: number;
  followUpEnabled: boolean;
  followUpDays: string;
  followUpChannel: string;
  quoteAccentColor: string;
  quoteFontFamily: string;
  quoteHeaderStyle: string;
  workingHours: string;
  serviceArea: string;
  notificationPrefs: string;
  darkMode: boolean;
  stripeEnabled: boolean;
  squareEnabled: boolean;
  bladeOrder?: string;
};

const QK = ['/api/settings'];

export function useSettings() {
  return useQuery<UserSettings>({
    queryKey: QK,
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const res = await apiRequest('PATCH', '/api/settings', updates);
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
