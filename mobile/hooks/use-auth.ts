import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import type { User } from "@shared/mobile-types";
import { apiRequest } from "@/lib/api";
import { loadCachedUser, saveCachedUser, clearCachedUser } from "@/lib/auth-cache";

async function fetchUser(): Promise<User | null> {
  // Read cache first so we can fall back if the network is down
  const cached = await loadCachedUser();

  try {
    const res = await apiRequest("GET", "/api/auth/user");

    if (res.status === 401) {
      await clearCachedUser();
      return null;
    }
    if (!res.ok) {
      // Server-side error (5xx) — keep user in app on cached session
      if (cached) return cached;
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const user: User = await res.json();
    await saveCachedUser(user);
    return user;
  } catch (err: any) {
    const msg = (err?.message ?? '').toLowerCase();
    const isNetworkError =
      msg.includes('network error') ||
      msg.includes('timed out') ||
      msg.includes('aborted');

    // Server sleeping / offline — keep user in app on cached session
    if (isNetworkError && cached) return cached;
    throw err;
  }
}

async function logoutRequest(): Promise<void> {
  await apiRequest("POST", "/api/logout").catch(() => {});
  await clearCachedUser();
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
    onSettled: () => {
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
