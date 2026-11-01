import { QueryClient } from "@tanstack/react-query";

/** How long the copy of the server data kept on the phone stays usable offline. */
export const OFFLINE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Worksite connections are flaky: keep data briefly fresh, retry
      // transient failures, and refetch when the connection returns
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      // As long as the persisted copy (lib/query-persist.ts): a query dropped from
      // memory sooner would also be dropped from the phone's offline copy.
      gcTime: OFFLINE_CACHE_MAX_AGE_MS,
    },
    mutations: {
      retry: 0,
      // Always attempt, even when the app believes it's offline. Paused, a save
      // would just spin; attempted, it fails fast with a network error, which is
      // what lets a new quote fall back to the offline outbox.
      networkMode: "always",
    },
  },
});
