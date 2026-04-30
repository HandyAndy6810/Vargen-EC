import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, buildUrl } from '@shared/mobile-routes';
import { type Invoice } from '@shared/mobile-types';
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

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      customerName?: string;
      items: Array<{ description: string; quantity: number; unit?: string; unitPrice: number }>;
      notes?: string;
      includeGST?: boolean;
      dueDate?: string;
    }) => {
      const res = await apiRequest('POST', api.invoices.list.path, data);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to create invoice');
      }
      return res.json() as Promise<Invoice>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      toast({ title: 'Invoice created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useConvertQuoteToInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (quoteId: number) => {
      const url = buildUrl(api.invoices.createFromQuote.path, { quoteId });
      const res = await apiRequest('POST', url);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to convert quote to invoice');
      }
      return res.json() as Promise<Invoice>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      toast({ title: 'Invoice created from quote' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
