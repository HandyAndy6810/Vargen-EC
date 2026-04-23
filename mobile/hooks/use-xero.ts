import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function useXeroStatus() {
  return useQuery({
    queryKey: ['xero-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/xero/status');
      if (!res.ok) return { connected: false };
      return res.json() as Promise<{ connected: boolean; tenantName?: string; connectedAt?: string }>;
    },
  });
}

export function useXeroDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/xero/disconnect');
      if (!res.ok) throw new Error('Failed to disconnect Xero');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['xero-status'] }),
  });
}

export function useXeroSyncAll() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/xero/sync-all-customers');
      if (!res.ok) throw new Error('Sync failed');
      return res.json() as Promise<{ synced: number; failed: number; total: number }>;
    },
  });
}
