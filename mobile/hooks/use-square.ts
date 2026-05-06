import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function useSquarePaymentLink() {
  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest('POST', `/api/square/payment-link/${invoiceId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Square payment unavailable' }));
        throw new Error(err.message);
      }
      return res.json() as Promise<{ url: string; id: string }>;
    },
  });
}
