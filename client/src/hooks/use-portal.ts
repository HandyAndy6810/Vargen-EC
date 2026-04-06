import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PortalData {
  quote: any;
  customer: any;
  items: any[];
  feedback: any[];
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
}

export function usePortalQuote(token: string) {
  return useQuery<PortalData>({
    queryKey: ["/api/portal", token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`);
      if (!res.ok) throw new Error("Quote not found");
      return res.json();
    },
    enabled: !!token,
  });
}

export function usePortalAccept(token: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (preferredDate?: string) => {
      const res = await fetch(`/api/portal/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredDate }),
      });
      if (!res.ok) throw new Error("Failed to accept quote");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Quote accepted!", description: "The tradesperson has been notified." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function usePortalDecline(token: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portal/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to decline quote");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Quote declined", description: "The tradesperson has been notified." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function usePortalFeedback(token: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/portal/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send feedback");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Feedback sent", description: "The tradesperson will review your request." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
