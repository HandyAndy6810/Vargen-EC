import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function useReceipts() {
  return useQuery({
    queryKey: ['/api/receipts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/receipts');
      if (!res.ok) throw new Error('Failed to fetch receipts');
      return res.json() as Promise<any[]>;
    },
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      vendor?: string;
      receiptDate?: string;
      totalAmount: string;
      category?: string;
      notes?: string;
      items?: string;
      jobId?: number;
    }) => {
      const res = await apiRequest('POST', '/api/receipts', data);
      if (!res.ok) throw new Error('Failed to save receipt');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/receipts/${id}`);
      if (!res.ok) throw new Error('Failed to delete receipt');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
    },
  });
}
