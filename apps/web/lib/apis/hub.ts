import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';

export const useHubOperations = () => {
   const queryClient = useQueryClient();

   // Fetch all hubs
   const getHubsQuery = useQuery({
      queryKey: ['hubs'],
      queryFn: () => api.get('/hubs').then((res: any) => res.data),
   });

   // Create Hub
   const createHub = useMutation({
      mutationFn: (hubData: any) => api.post('/hubs', hubData),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['hubs'] });
      },
   });

   // Update Hub
   const updateHub = useMutation({
      mutationFn: (hubData: any) => api.put(`/hubs/${hubData.id}`, hubData),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['hubs'] });
      },
   });

   // Delete Hub
   const deleteHub = useMutation({
      mutationFn: (hubData: any) => api.delete(`/hubs/${hubData.id}`),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['hubs'] });
      },
   });

   return {
      getHubsQuery,
      createHub,
      updateHub,
      deleteHub,
   };
};
