import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

/** One line waiting to be sorted (GET /api/price-unsure). */
export type UnsureLine = {
  id: number;
  receiptId: number;
  text: string;
  unit: string | null;
  supplier: string | null;
  receiptDate: string | null;
  quantity: number;
  perUnit: number;
  amount: number | null;
  guess: { item: string; unit: string; factor: number | null; aiFactor: number | null } | null;
};

export const UNSURE_KEY = ['/api/price-unsure'];

/** The tradie's unsure receipt lines (pricing step 4), or one receipt's. */
export function useUnsureLines(receiptId?: number) {
  return useQuery<UnsureLine[]>({
    queryKey: receiptId != null ? [...UNSURE_KEY, receiptId] : UNSURE_KEY,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/price-unsure${receiptId != null ? `?receiptId=${receiptId}` : ''}`);
      if (!res.ok) throw new Error('Could not load');
      return res.json();
    },
  });
}

