// lib/apis/user.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken, apiClient } from '@/components/providers/token-provider';
import { useSession } from 'next-auth/react';

// Fetch user profile
export const useUserProfile = () => {
  const { status } = useSession();
  const { isTokenReady } = useAuthToken();

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await apiClient.get<{ id: string; name: string; email: string }>('/auth/me');
      return response.data;
    },
    enabled: status === 'authenticated' && isTokenReady, // Only run when authenticated AND token is ready
    retry: 0, // Disable retries to avoid multiple requests on 401
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
};

// Update user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; name: string; email: string }) =>
      apiClient.put(`/users/${data.userId}`, { name: data.name, email: data.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
