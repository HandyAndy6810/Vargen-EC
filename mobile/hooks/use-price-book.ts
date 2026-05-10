import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export interface PriceBookItem {
  id: number;
  userId: string;
  description: string;
  unit: string;
  price: string;
  supplier: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export function usePriceBook() {
  return useQuery<PriceBookItem[]>({
    queryKey: ['/api/price-book'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/price-book');
      if (!res.ok) throw new Error('Failed to fetch price book');
      return res.json();
    },
  });
}

export function useCreatePriceBookItem() {
  return useMutation({
    mutationFn: async (data: { description: string; unit: string; price: string; supplier?: string; category?: string }) => {
      const res = await apiRequest('POST', '/api/price-book', data);
      if (!res.ok) throw new Error('Failed to create item');
      return res.json() as Promise<PriceBookItem>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/price-book'] }),
  });
}

export function useUpdatePriceBookItem() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; description?: string; unit?: string; price?: string; supplier?: string; category?: string }) => {
      const res = await apiRequest('PATCH', `/api/price-book/${id}`, data);
      if (!res.ok) throw new Error('Failed to update item');
      return res.json() as Promise<PriceBookItem>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/price-book'] }),
  });
}

export function useDeletePriceBookItem() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/price-book/${id}`);
      if (!res.ok) throw new Error('Failed to delete item');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/price-book'] }),
  });
}
