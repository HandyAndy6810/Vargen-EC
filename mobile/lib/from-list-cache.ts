import { queryClient } from './queryClient';

/**
 * Start a detail query from the matching row of its list, when the list is in the
 * cache. Every list endpoint returns the full row (plus joined names), so offline a
 * quote, job, invoice or customer opens from the copy kept on the phone even if its
 * own detail screen was never visited. Online, the detail still refetches as normal
 * (the list's fetch time is passed on, so staleness is judged honestly).
 */
export function fromListCache<T extends { id?: unknown }>(listPath: string, id: number) {
  return {
    initialData: () =>
      (queryClient.getQueryData<T[]>([listPath]) ?? []).find(r => Number(r?.id) === id),
    initialDataUpdatedAt: () => queryClient.getQueryState([listPath])?.dataUpdatedAt,
  };
}
