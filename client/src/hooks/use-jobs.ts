import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertJob, type Job } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Helper for dates
const dateParser = (val: unknown) => {
  if (typeof val === 'string') return new Date(val);
  return val;
};

export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const res = await fetch(api.jobs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      // Need to handle Date parsing since JSON doesn't support Date objects
      const data = await res.json();
      const parsedData = data.map((job: any) => ({
        ...job,
        scheduledDate: job.scheduledDate ? new Date(job.scheduledDate) : null,
        createdAt: job.createdAt ? new Date(job.createdAt) : null,
      }));
      return api.jobs.list.responses[200].parse(parsedData);
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.jobs.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      const data = await res.json();
      const parsedData = {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        createdAt: data.createdAt ? new Date(data.createdAt) : null,
      };
      return api.jobs.get.responses[200].parse(parsedData);
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertJob) => {
      // Ensure dates are strings for JSON
      const payload = {
        ...data,
        scheduledDate: data.scheduledDate instanceof Date ? data.scheduledDate.toISOString() : data.scheduledDate,
      };

      const res = await fetch(api.jobs.create.path, {
        method: api.jobs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to create job");
      return api.jobs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Scheduled", description: "New job has been added to the schedule." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertJob>) => {
      const url = buildUrl(api.jobs.update.path, { id });
      
      const payload = {
        ...updates,
        scheduledDate: updates.scheduledDate instanceof Date ? updates.scheduledDate.toISOString() : updates.scheduledDate,
      };

      const res = await fetch(url, {
        method: api.jobs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update job");
      return api.jobs.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Updated", description: "Changes have been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}
