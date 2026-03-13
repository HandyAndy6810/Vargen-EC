import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertUserSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useUserSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<InsertUserSettings, "userId">>) => {
      const res = await fetch(api.settings.update.path, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
    onError: (error) => {
      toast({ title: "Settings not saved", description: error.message, variant: "destructive" });
    },
  });
}
