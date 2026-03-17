import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { JobTimerEntry } from "@shared/schema";

export function useActiveTimer() {
  return useQuery<JobTimerEntry | null>({
    queryKey: ["/api/timers/active"],
    queryFn: async () => {
      const res = await fetch("/api/timers/active", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 5000, // poll every 5s to keep timer UI fresh
  });
}

export function useTimerEntries(jobId: number) {
  return useQuery<JobTimerEntry[]>({
    queryKey: ["/api/jobs", jobId, "timers"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/timers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch timer entries");
      return res.json();
    },
    enabled: !!jobId,
  });
}

export function useStartTimer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: number) => {
      const res = await fetch("/api/timers/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start timer");
      }
      return res.json() as Promise<JobTimerEntry>;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", entry.jobId, "timers"] });
      // Store in localStorage for persistence across navigation
      localStorage.setItem("activeTimer", JSON.stringify({
        timerId: entry.id,
        jobId: entry.jobId,
        startTime: entry.startTime,
      }));
      toast({ title: "Timer started", description: "Tracking time on this job" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const res = await fetch(`/api/timers/${id}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to stop timer");
      }
      return res.json() as Promise<JobTimerEntry>;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", entry.jobId, "timers"] });
      localStorage.removeItem("activeTimer");
      const mins = Math.round((entry.duration || 0) / 60);
      toast({ title: "Timer stopped", description: `${mins} minutes logged` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTimerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/timers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete timer entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers/active"] });
    },
  });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
