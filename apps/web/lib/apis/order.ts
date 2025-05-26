import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';

export const useCreateOrder = () => {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: (orderData: any) => api.post('/orders', orderData),
      onSuccess: () => {
         // Invalidate orders list and dashboard data
         queryClient.invalidateQueries({ queryKey: ['orders'] });
         queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
   });
};