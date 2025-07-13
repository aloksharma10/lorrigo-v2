import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { api as axios } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  profile: {
    company_name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  _count: {
    orders: number;
    shipments: number;
    transactions: number;
    weight_disputes: number;
  };
  wallet_balance: number;
  plan?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// API Functions
const usersAPI = {
  // Get users with pagination
  getUsers: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
    return await axios.get('/users', { params });
  },

  // Get user by ID
  getUserById: async (id: string): Promise<{ success: boolean; user: User }> => {
    return await axios.get(`/users/${id}`);
  },

  // Update user
  updateUser: async (id: string, data: Partial<User>): Promise<{ success: boolean; user: User }> => {
    return await axios.put(`/users/${id}`, data);
  },
};

// Comprehensive hook for user operations
export function useUserOperations(params: PaginationParams = {}) {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Fetch users with pagination
  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersAPI.getUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady,
  });

  // Fetch user by ID
  const getUserById = (id: string) => {
    return useQuery({
      queryKey: ['user', id],
      queryFn: () => usersAPI.getUserById(id),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      enabled: !!id && isTokenReady,
    });
  };

  // Update user
  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => usersAPI.updateUser(id, data),
    onSuccess: (data) => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  return {
    usersQuery,
    getUserById,
    updateUser,
  };
}

export default usersAPI; 