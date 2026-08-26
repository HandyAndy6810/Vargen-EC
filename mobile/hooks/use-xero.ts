import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from '@/lib/api';

/**
 * Connect Xero from the app. Fetches an auth URL (authenticated, so the server
 * can bind the user's identity into a signed state), opens it in an in-app
 * browser, and returns when Xero sends the user back via the vargen:// deep
 * link. The app cookie isn't shared with the browser, which is why identity
 * rides in the state rather than the session.
 */
export function useXeroConnect() {
  const qc = useQueryClient();
  return async (): Promise<'success' | 'error' | 'dismissed'> => {
    const res = await apiRequest('POST', '/api/xero/connect-url');
    if (!res.ok) return 'error';
    const { url } = await res.json();
    const result = await WebBrowser.openAuthSessionAsync(url, 'vargen://xero');
    // Refresh regardless — the callback may have connected before the browser closed
    qc.invalidateQueries({ queryKey: ['xero-status'] });
    if (result.type === 'success' && result.url) {
      if (result.url.includes('status=success')) return 'success';
      if (result.url.includes('status=error')) return 'error';
    }
    return 'dismissed';
  };
}

export function useCreateXeroInvoice(quoteId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/xero/invoice/${quoteId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to create Xero invoice');
      }
      return res.json() as Promise<{ invoiceId: string; invoiceNumber: string; alreadyExists?: boolean }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
    },
  });
}

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
