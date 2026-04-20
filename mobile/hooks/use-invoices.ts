import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, buildUrl } from '@shared/routes';
import { type Invoice } from '@shared/schema';
import { useToast } from '@/lib/toast';
import { apiRequest } from '@/lib/api';

export function useInvoices() {
  return useQuery({
    queryKey: [api.invoices.list.path],
    queryFn: async () => {
      const res = await apiRequest('GET', api.invoices.list.path);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json() as Promise<Invoice[]>;
    },
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: [api.invoices.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.invoices.get.path, { id });
      const res = await apiRequest('GET', url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch invoice');
      return res.json() as Promise<Invoice>;
    },
    enabled: !!id,
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Invoice>) => {
      const url = buildUrl(api.invoices.update.path, { id });
      const res = await apiRequest('PATCH', url, updates);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to update invoice');
      }
      return res.json() as Promise<Invoice>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      toast({ title: 'Invoice Updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
