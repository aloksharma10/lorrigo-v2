import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export const usePlanOperations = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();

  const getPlansQuery = () => {
    return useQuery({
      queryKey: ['plans'],
      queryFn: () => api.get('/plans').then((res: any) => res?.plans || []),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: isTokenReady, // Only run query when token is ready
    });
  }

  const getPlanById = (id: string) => {
    return useQuery({
      queryKey: ['plan', id],
      enabled: !!id && isTokenReady,
      queryFn: () => api.get(`/plans/${id}`).then((res: any) => res?.plan || null),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 3,
    });
  }

  const getUsersQuery = ({
    queryKey,
    search,
    enabled = true
  }: {
    queryKey: string[];
    search?: string;
    enabled?: boolean;
  }) =>
    useQuery({
      queryKey,
      enabled: enabled && isTokenReady,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 2,
      queryFn: async () => {
        const response: any = await api.get('/sellers', {
          params: search ? { search } : {}
        });
        return response?.sellers || [];
      },
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: 1000,
    });

  const getDefaultPlanQuery = useQuery({
    queryKey: ['defaultPlan'],
    queryFn: () => {
      const plans = queryClient.getQueryData<any[]>(['plans']);
      if (plans) {
        const defaultPlan = plans.find(plan => plan.isDefault);
        if (defaultPlan) return defaultPlan;
      }

      return api.get('/plans').then((res: any) => {
        const plans = res?.plans || [];
        return plans.find((plan: any) => plan.isDefault) || null;
      });
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isTokenReady,
  });

  // Create Plan
  const createPlan = useMutation({
    mutationFn: (planData: any) => api.post('/plans', planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['defaultPlan'] });
    },
  });

  // Update Plan
  const updatePlan = useMutation({
    mutationFn: (planData: any) => api.put(`/plans/${planData.id}`, planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['defaultPlan'] });
    },
  });

  // Delete Plan
  const deletePlan = useMutation({
    mutationFn: (planId: string) => api.delete(`/plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['defaultPlan'] });
    },
  });

  // Assign Plan to User
  const assignPlanToUser = useMutation({
    mutationFn: ({ planId, userId }: { planId: string; userId: string }) =>
      api.post(`/plans/assign/${planId}/user/${userId}`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-assignments'] });
    },
  });

  // Get Default Plan Courier Pricing
  const getDefaultPlanCourierPricing = async (courierId: string) => {
    try {
      const response: any = await api.get(`/plans/default-pricing/${courierId}`);
      return response?.pricing || null;
    } catch (error) {
      console.error('Error fetching default plan courier pricing:', error);
      return null;
    }
  };

  return {
    getPlansQuery,
    getPlanById,
    getDefaultPlanQuery,
    createPlan,
    updatePlan,
    deletePlan,
    assignPlanToUser,
    getDefaultPlanCourierPricing,
    getUsersQuery,
  };
};