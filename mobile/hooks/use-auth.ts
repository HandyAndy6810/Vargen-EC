import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import type { User } from "@shared/models/auth";
import { apiRequest } from "@/lib/api";

async function fetchUser(): Promise<User | null> {
  const res = await apiRequest("GET", "/api/auth/user");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

async function logoutRequest(): Promise<void> {
  await apiRequest("POST", "/api/logout");
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      router.replace("/(auth)/login");
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
