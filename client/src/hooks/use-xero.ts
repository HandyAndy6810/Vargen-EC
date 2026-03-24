import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface XeroStatus {
  connected: boolean;
  tenantName?: string;
  connectedAt?: string;
}

export function useXeroStatus() {
  return useQuery<XeroStatus>({
    queryKey: ["/api/xero/status"],
    queryFn: async () => {
      const res = await fetch("/api/xero/status", { credentials: "include" });
      if (res.status === 401) return { connected: false };
      if (!res.ok) throw new Error("Failed to fetch Xero status");
      return res.json();
    },
  });
}

export function useXeroDisconnect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/xero/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to disconnect");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/xero/status"] });
      toast({ title: "Xero disconnected" });
    },
    onError: (error) => {
      toast({ title: "Failed to disconnect", description: error.message, variant: "destructive" });
    },
  });
}

export function useXeroSyncCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerId: number) => {
      const res = await fetch(`/api/xero/sync-customer/${customerId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to sync contact");
      }
      return res.json() as Promise<{ ok: boolean; contactId: string; name: string }>;
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Synced to Xero", description: "Contact updated in Xero." });
    },
    onError: (error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useXeroSyncAllCustomers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/xero/sync-all-customers", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to sync customers");
      }
      return res.json() as Promise<{ ok: boolean; synced: number; failed: number; total: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: `Synced ${data.synced} of ${data.total} customers`,
        description: data.failed > 0 ? `${data.failed} contact(s) could not be synced. Check that their details are complete.` : "All contacts up to date in Xero.",
      });
    },
    onError: (error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useXeroCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await fetch(`/api/xero/invoice/${quoteId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to create invoice");
      }
      return res.json() as Promise<{ ok: boolean; invoiceId: string; invoiceNumber: string; alreadyExists?: boolean }>;
    },
    onSuccess: (data, quoteId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: data.alreadyExists ? "Invoice already exists" : "Xero invoice created",
        description: `Invoice ${data.invoiceNumber} is now in Xero.`,
      });
    },
    onError: (error) => {
      toast({ title: "Invoice creation failed", description: error.message, variant: "destructive" });
    },
  });
}
