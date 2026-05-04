import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/mobile-routes";
import { type Quote } from "@shared/mobile-types";
import { useToast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";

export function useQuotes() {
  return useQuery({
    queryKey: [api.quotes.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.quotes.list.path);
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json() as Promise<Quote[]>;
    },
  });
}

export function useQuote(id: number) {
  return useQuery({
    queryKey: [api.quotes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.quotes.get.path, { id });
      const res = await apiRequest("GET", url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch quote");
      return res.json() as Promise<Quote>;
    },
    enabled: !!id,
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Quote>) => {
      const url = buildUrl(api.quotes.update.path, { id });
      const res = await apiRequest("PATCH", url, updates);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to update quote");
      }
      return res.json() as Promise<Quote>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      toast({ title: "Quote Updated", description: "Status changed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useQuoteItems(quoteId: number) {
  return useQuery({
    queryKey: [`/api/quotes/${quoteId}/items`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/quotes/${quoteId}/items`);
      if (!res.ok) throw new Error('Failed to fetch quote items');
      return res.json() as Promise<Array<{
        id: number;
        quoteId: number;
        description: string;
        quantity: number;
        price: string;
      }>>;
    },
    enabled: !!quoteId,
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.quotes.delete.path, { id });
      const res = await apiRequest("DELETE", url);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete quote");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
      toast({ title: "Quote Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
