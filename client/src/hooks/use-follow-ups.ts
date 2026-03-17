import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Quote } from "@shared/schema";

interface DueFollowUp {
  quote: Quote;
  dueIndex: number;
  dayNumber: number;
}

export function useFollowUpsDue() {
  return useQuery<DueFollowUp[]>({
    queryKey: ["/api/follow-ups/due"],
    queryFn: async () => {
      const res = await fetch("/api/follow-ups/due", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000, // check every minute
  });
}

export function useMarkFollowUpSent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, dayIndex }: { quoteId: number; dayIndex: number }) => {
      const res = await fetch(`/api/follow-ups/${quoteId}/mark-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dayIndex }),
      });
      if (!res.ok) throw new Error("Failed to mark follow-up");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups/due"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Follow-up marked as sent" });
    },
  });
}

export function useSkipFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, dayIndex }: { quoteId: number; dayIndex: number }) => {
      const res = await fetch(`/api/follow-ups/${quoteId}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dayIndex }),
      });
      if (!res.ok) throw new Error("Failed to skip follow-up");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups/due"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
  });
}
