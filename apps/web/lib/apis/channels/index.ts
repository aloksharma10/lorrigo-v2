import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuthToken } from '@/components/providers/token-provider';

// Types
export interface ChannelConfig {
  id: string;
  name: string;
  nickname: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    couriers: number;
  };
  couriers?: Array<{
    id: string;
    code: string;
    name: string;
    is_active: boolean;
    courier_code?: string;
    type?: string;
  }>;
}

export interface ChannelConfigCreateInput {
  name: string;
  nickname: string;
  is_active?: boolean;
}

export interface ChannelConfigUpdateInput {
  id: string;
  name?: string;
  nickname?: string;
  is_active?: boolean;
}

/**
 * Custom hook for channel configuration operations
 * Provides all channel-related queries and mutations in one place
 */
export const useChannels = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();

  // Get all channel configurations with pagination and filtering
  const getChannels = (page = 1, limit = 10, search?: string, is_active?: boolean) => {
    return useQuery({
      queryKey: ['channels', 'configs', { page, limit, search, is_active }],
      queryFn: async () => {
        const params: Record<string, string | number | boolean | undefined> = {
          page,
          limit,
          search,
          is_active,
        };

        const response = await apiClient.get('/channels', { params });
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: isTokenReady,
    });
  };

  // Get active channel configurations (for dropdowns/selection)
  const getActiveChannels = () => {
    return useQuery({
      queryKey: ['channels', 'configs', 'active'],
      queryFn: async () => {
        const response = await apiClient.get('/channels/active');
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: isTokenReady,
    });
  };

  // Get a single channel configuration by ID
  const getChannelById = (id: string | null) => {
    return useQuery({
      queryKey: ['channels', 'config', id],
      queryFn: async () => {
        const response = await apiClient.get(`/channels/${id}`);
        return response.data;
      },
      enabled: isTokenReady && !!id,
    });
  };

  // Get a channel configuration by name or nickname
  const getChannelByIdentifier = (identifier: string | null) => {
    return useQuery({
      queryKey: ['channels', 'config', 'identifier', identifier],
      queryFn: async () => {
        const response = await apiClient.get(`/channels/lookup/${identifier}`);
        return response.data;
      },
      enabled: isTokenReady && !!identifier,
    });
  };

  // Create a new channel configuration
  const createChannel = useMutation({
    mutationFn: async (channelData: ChannelConfigCreateInput) => {
      const response = await apiClient.post('/channels', channelData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'configs'] });
    },
  });

  // Update a channel configuration
  const updateChannel = useMutation({
    mutationFn: async (channelData: ChannelConfigUpdateInput) => {
      const { id, ...data } = channelData;
      const response = await apiClient.put(`/channels/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'configs'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'config', variables.id] });
    },
  });

  // Delete a channel configuration
  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiClient.delete(`/channels/${channelId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'configs'] });
    },
  });

  // Toggle channel active status
  const toggleChannelStatus = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiClient.patch(`/channels/${channelId}/toggle`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'configs'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'config', variables] });
    },
  });

  return {
    // Queries
    getChannels,
    getActiveChannels,
    getChannelById,
    getChannelByIdentifier,

    // Mutations
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannelStatus,
  };
};
