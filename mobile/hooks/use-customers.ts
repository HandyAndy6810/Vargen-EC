import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCustomer, type Customer } from "@shared/schema";
import { useToast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";

export function useCustomers() {
  return useQuery({
    queryKey: [api.customers.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.customers.list.path);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: [api.customers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.customers.get.path, { id });
      const res = await apiRequest("GET", url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch customer");
      return res.json() as Promise<Customer>;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", api.customers.create.path, data);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to create customer");
      }
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Customer Created", description: "New customer added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomer> }) => {
      const url = buildUrl(api.customers.update.path, { id });
      const res = await apiRequest("PATCH", url, data);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to update customer");
      }
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Customer Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.customers.delete.path, { id });
      const res = await apiRequest("DELETE", url);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete customer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
      toast({ title: "Customer Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
