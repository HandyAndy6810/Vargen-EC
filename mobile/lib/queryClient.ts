import { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function getQueryFn<T>(options: { on401?: "returnNull" | "throw" } = {}) {
  return async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<T | null> => {
    const path = queryKey[0] as string;
    const res = await apiRequest("GET", path);

    if (res.status === 401) {
      if (options.on401 === "returnNull") return null;
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    return res.json();
  };
}
