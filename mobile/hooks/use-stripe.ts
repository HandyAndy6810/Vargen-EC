import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function useStripePaymentLink() {
  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest('POST', `/api/stripe/payment-link/${invoiceId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to create payment link');
      }
      return res.json() as Promise<{ url: string; id: string }>;
    },
  });
}
