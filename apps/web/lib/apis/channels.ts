import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "./axios"
import { useAuthToken } from "@/components/providers/token-provider"

export const useChannelOperations = () => {
  const queryClient = useQueryClient()
  const { isTokenReady } = useAuthToken()

  // Fetch all channels
  const getChannelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: () => api.get("/channels").then((res: any) => res?.channelConfigs || []),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isTokenReady, // Only run query when token is ready
  })

  // Create Channel
  const createChannel = useMutation({
    mutationFn: (channelData: any) => api.post("/channels", channelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] })
    },
  })

  // Update Channel
  const updateChannel = useMutation({
    mutationFn: (channelData: any) => api.put(`/channels/${channelData.id}`, channelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] })
    },
  })

  // Delete Channel
  const deleteChannel = useMutation({
    mutationFn: (channelId: string) => api.delete(`/channels/${channelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] })
    },
  })

  return {
    getChannelsQuery,
    createChannel,
    updateChannel,
    deleteChannel,
  }
}
