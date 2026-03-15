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
