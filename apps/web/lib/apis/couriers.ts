import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export const useCourierOperations = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();

  // Fetch all couriers
  const getCouriersQuery = useQuery({
    queryKey: ['couriers'],
    queryFn: () => api.get<any>('/couriers'),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isTokenReady, // Only run query when token is ready
  });

  // Create Courier
  const createCourier = useMutation({
    mutationFn: (courierData: any) => api.post('/couriers', courierData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  // Update Courier
  const updateCourier = useMutation({
    mutationFn: (courierData: any) => api.put(`/couriers/${courierData.id}`, courierData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  // Delete Courier
  const deleteCourier = useMutation({
    mutationFn: (courierId: string) => api.delete(`/couriers/${courierId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  return {
    getCouriersQuery,
    createCourier,
    updateCourier,
    deleteCourier,
  };
};
