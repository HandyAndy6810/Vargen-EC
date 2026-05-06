import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function useSettings() {
  return useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const res = await apiRequest('PATCH', '/api/settings', patch);
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });
}
