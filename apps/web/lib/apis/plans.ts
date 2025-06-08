import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "./axios"
import { useAuthToken } from "@/components/providers/token-provider"

export const usePlanOperations = () => {
  const queryClient = useQueryClient()
  const { isTokenReady } = useAuthToken()

  // Fetch all plans
  const getPlansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get("/plans").then((res: any) => res?.plans || []),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isTokenReady, // Only run query when token is ready
  })

  // Create Plan
  const createPlan = useMutation({
    mutationFn: (planData: any) => api.post("/plans", planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
    },
  })

  // Update Plan
  const updatePlan = useMutation({
    mutationFn: (planData: any) => api.put(`/plans/${planData.id}`, planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
    },
  })

  // Delete Plan
  const deletePlan = useMutation({
    mutationFn: (planId: string) => api.delete(`/plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
    },
  })

  // Assign Plan to User
  const assignPlanToUser = useMutation({
    mutationFn: ({ planId, userId }: { planId: string; userId: string }) =>
      api.post(`/plans/assign/${planId}/user/${userId}`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
      queryClient.invalidateQueries({ queryKey: ["plan-assignments"] })
    },
  })

  return {
    getPlansQuery,
    createPlan,
    updatePlan,
    deletePlan,
    assignPlanToUser,
  }
}
