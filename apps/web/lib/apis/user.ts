import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/components/providers/token-provider';
import { useSession } from 'next-auth/react';

// Fetch user profile
export const useUserProfile = () => {
   const { status } = useSession();

   return useQuery({
      queryKey: ['user'], // Ensure the query key is stable
      queryFn: async () => {
         const response = await apiClient.get<{ id: string; name: string; email: string }>('/auth/me');
         return response.data;
      },
      enabled: status === 'authenticated', // Only run query if authenticated
      retry: 1,
      refetchOnWindowFocus: false, // Prevent refetch on window focus (useful in dev)
      staleTime: 5 * 60 * 1000, // Cache the data for 5 minutes
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