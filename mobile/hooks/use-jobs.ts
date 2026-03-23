import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertJob } from "@shared/schema";
import { useToast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";

export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.jobs.list.path);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      return data.map((job: any) => ({
        ...job,
        scheduledDate: job.scheduledDate ? new Date(job.scheduledDate) : null,
        createdAt: job.createdAt ? new Date(job.createdAt) : null,
      }));
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.jobs.get.path, { id });
      const res = await apiRequest("GET", url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      const data = await res.json();
      return {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        createdAt: data.createdAt ? new Date(data.createdAt) : null,
      };
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertJob) => {
      const payload = {
        ...data,
        scheduledDate:
          data.scheduledDate instanceof Date
            ? data.scheduledDate.toISOString()
            : data.scheduledDate,
      };
      const res = await apiRequest("POST", api.jobs.create.path, payload);
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Scheduled", description: "New job added to schedule." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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
        scheduledDate:
          updates.scheduledDate instanceof Date
            ? updates.scheduledDate.toISOString()
            : updates.scheduledDate,
      };
      const res = await apiRequest("PATCH", url, payload);
      if (!res.ok) throw new Error("Failed to update job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Updated", description: "Changes saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
