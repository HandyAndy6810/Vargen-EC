import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, extractError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function useCustomerMessages(customerId: number) {
  return useQuery({
    queryKey: ['/api/customers', customerId, 'messages'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/customers/${customerId}/messages`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    enabled: !!customerId,
    refetchInterval: 5000, // poll every 5s for new messages
  });
}

export function useSendMessage(customerId: number) {
  return useMutation({
    mutationFn: async (payload: { body: string; direction?: 'in' | 'out'; channel?: 'note' | 'sms' | 'email'; jobId?: number; quoteId?: number }) => {
      const res = await apiRequest('POST', `/api/customers/${customerId}/messages`, payload);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'messages'] });
    },
  });
}

export function useDeleteMessage(customerId: number) {
  return useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest('DELETE', `/api/customers/${customerId}/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'messages'] });
    },
  });
}
