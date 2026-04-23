import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function useSendSms() {
  return useMutation({
    mutationFn: async ({ to, message }: { to: string; message: string }) => {
      const res = await apiRequest('POST', '/api/sms/send', { to, message });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to send SMS');
      }
      return res.json() as Promise<{ ok: boolean; sid: string }>;
    },
  });
}
