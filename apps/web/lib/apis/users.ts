import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { api as axios } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types
export interface UserProfile {
  id: string;
  user_id: string;
  
  // Company Details
  company?: string;
  company_name?: string;
  logo_url?: string;
  
  // KYC Details
  business_type?: string;
  pan?: string;
  adhaar?: string;
  gst_no?: string;
  kyc_submitted: boolean;
  kyc_verified: boolean;
  
  // Bank Details
  acc_holder_name?: string;
  acc_number?: string;
  ifsc_number?: string;
  acc_type?: string;
  
  // Seller Config
  is_d2c: boolean;
  is_b2b: boolean;
  is_prepaid: boolean;
  is_fw: boolean;
  is_rto: boolean;
  is_cod: boolean;
  is_cod_reversal: boolean;
  
  // Notification Settings
  notification_settings: Record<string, boolean>;
  
  // Billing and Remittance Configuration
  payment_method: string;
  remittance_cycle: string;
  remittance_min_amount: number;
  cod_remittance_pending: number;
  remittance_days_of_week: number[];
  remittance_days_after_delivery: number;
  early_remittance_charge: number;
  ndr_boost?: Record<string, any>;
  
  // Billing Cycle
  billing_cycle_start_date?: string;
  billing_cycle_end_date?: string;
  billing_cycle_type: string;
  
  // Label/Manifest Format
  label_format: string;
  manifest_format: string;
  
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  profile: UserProfile | null;
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
  
  // Update user profile
  updateUserProfile: async (userId: string, data: Partial<UserProfile>): Promise<{ success: boolean; profile: UserProfile }> => {
    return await axios.put(`/users/${userId}/profile`, data);
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
  
  // Update user profile
  const updateUserProfile = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserProfile> }) => 
      usersAPI.updateUserProfile(userId, data),
    onSuccess: (data) => {
      toast.success('User profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user profile');
    },
  });

  return {
    usersQuery,
    getUserById,
    updateUser,
    updateUserProfile,
  };
}

export default usersAPI; 