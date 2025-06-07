import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { OrderFormValues } from '@lorrigo/utils';

export const useCreateOrder = () => {
   const queryClient = useQueryClient();

   const createOrder = useMutation({
      mutationFn: (orderData: OrderFormValues) => api.post('/orders', orderData),
      onSuccess: (data) => {
         // Invalidate orders list and dashboard data
         queryClient.invalidateQueries({ queryKey: ['orders'] });
         queryClient.invalidateQueries({ queryKey: ['dashboard'] });
         return data;
      },
   });

   return { createOrder };
};