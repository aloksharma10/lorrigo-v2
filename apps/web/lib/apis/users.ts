import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { api as axios } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types
export interface UserProfile {
  id: string;
  user_id: string;
  wallet_type: 'WALLET' | 'REMITTANCE_WALLET' | 'POSTPAID';

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
  remittance_days_of_week: number[];
  remittance_days_after_delivery: number;
  early_remittance_charge: number;
  ndr_boost?: Record<string, any>;

  // Wallet Configuration (Admin Set)
  max_negative_amount?: number;

  // Billing Cycle Configuration
  billing_cycle_type: string;
  billing_days_of_week: number[];
  billing_day_of_month?: number;
  billing_week_of_month?: number;
  billing_days: number[];

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

export interface UserBankAccount {
  id: string;
  user_id: string;
  account_number: string;
  ifsc: string;
  bank_name: string;
  acc_type: 'SAVINGS' | 'CURRENT' | undefined;
  account_holder: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  is_selected_for_remittance: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountFormData {
  account_number: string;
  ifsc: string;
  bank_name: string;
  account_holder: string;
}

export interface BankAccountUpdateData extends Partial<BankAccountFormData> {
  is_verified?: boolean;
  is_selected_for_remittance?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sort?: { id: string; desc: boolean }[];
  filters?: { id: string; value: any }[];
  globalFilter?: string;
  dateRange?: { from: Date; to: Date };
}

export interface BankAccountParams extends PaginationParams {
  is_verified?: boolean;
  is_selected_for_remittance?: boolean;
  bank_name?: string;
  account_holder?: string;
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
export const usersAPI = {
  // Get users with pagination
  getUsers: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
    return await axios.get('/users', { params });
  },

  // Get user by ID
  getUserById: async (id: string): Promise<{ success: boolean; user: User }> => {
    return await axios.get(`/users/${id}`);
  },

  // getMyProfile
  getMyProfile: async (): Promise<{ success: boolean; user: User }> => {
    return await axios.get('/users/me');
  },

  // Update user
  updateUser: async (id: string, data: Partial<User>): Promise<{ success: boolean; user: User }> => {
    return await axios.put(`/users/${id}`, data);
  },

  // Update user profile
  updateUserProfile: async (userId: string, data: Partial<UserProfile>): Promise<{ success: boolean; profile: UserProfile }> => {
    return await axios.put(`/users/${userId}/profile`, data);
  },

  // Update my profile (self)
  updateMyProfile: async (data: Partial<UserProfile>): Promise<{ success: boolean; profile: UserProfile }> => {
    return await axios.put(`/users/me/profile`, data);
  },

  // Bank Account functions
  getUserBankAccounts: async (userId: string, params: BankAccountParams = {}) => {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 15,
      search: params.globalFilter || params.search,
      is_verified: params.is_verified,
      is_selected_for_remittance: params.is_selected_for_remittance,
      bank_name: params.bank_name,
      account_holder: params.account_holder,
      sort: params.sort,
      filters: params.filters,
      userId: userId,
    };

    const response = await axios.get<{
      success: boolean;
      bankAccounts: UserBankAccount[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/users/bank-accounts`, { params: queryParams });

    return {
      success: response.success,
      data: response.bankAccounts,
      meta: {
        total: response.pagination.total,
        page: response.pagination.page,
        limit: response.pagination.limit,
      },
    };
  },

  addUserBankAccount: async (_userId: string, data: BankAccountFormData) => {
    return await axios.post<{ success: boolean; bankAccount: UserBankAccount }>(`/users/bank-accounts`, data);
  },

  updateUserBankAccount: async (_userId: string, bankAccountId: string, data: BankAccountUpdateData) => {
    return await axios.put<{ success: boolean; bankAccount: UserBankAccount }>(`/users/bank-accounts/${bankAccountId}`, data);
  },

  deleteUserBankAccount: async (_userId: string, bankAccountId: string) => {
    return await axios.delete<{ success: boolean; message: string }>(`/users/bank-accounts/${bankAccountId}`);
  },

  // Password reset functions
  forgotPassword: async (email: string) => {
    return await axios.post<{ success: boolean; message: string; otpId?: string }>('/auth/forgot-password', { email });
  },

  resetPassword: async (payload: { email: string; otp: string; newPassword: string; confirmPassword: string }) => {
    return await axios.post<{ success: boolean; message: string }>('/auth/reset-password', payload);
  },

  // Google OAuth functions
  loginWithGoogle: async (payload: { email: string; name: string; googleId: string; image?: string }) => {
    return await axios.post<{ success: boolean; user: any; token: string }>('/auth/login/google', payload);
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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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

  // getMyProfile
  const getMyProfile = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => usersAPI.getMyProfile(),
    enabled: isTokenReady,
  });

  // Update user
  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => usersAPI.updateUser(id, data),
    onSuccess: (data) => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  // Update user profile
  const updateUserProfile = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserProfile> }) => usersAPI.updateUserProfile(userId, data),
    onSuccess: (data) => {
      toast.success('User profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user profile');
    },
  });

  // Update my profile (self)
  const updateMyProfile = useMutation({
    mutationFn: (data: Partial<UserProfile>) => usersAPI.updateMyProfile(data),
    onSuccess: (data) => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    },
  });

  return {
    usersQuery,
    getUserById,
    updateUser,
    updateUserProfile,
    updateMyProfile,
    getMyProfile,
  };
}

// Bank Account React Query hooks
export const useUserBankAccounts = (userId: string, params: BankAccountParams = {}) => {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['user-bank-accounts', userId, params],
    queryFn: () => usersAPI.getUserBankAccounts(userId, params),
    enabled: isTokenReady && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retryOnMount: false,
    retry: false,
  });
};

export const useAddUserBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: BankAccountFormData }) => usersAPI.addUserBankAccount(userId, data),
    onSuccess: (data, { userId }) => {
      if (data.success) {
        toast.success('Bank account added successfully');
        queryClient.invalidateQueries({ queryKey: ['user-bank-accounts', userId] });
      } else {
        toast.error('Failed to add bank account');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add bank account');
    },
  });
};

export const useUpdateUserBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, bankAccountId, data }: { userId: string; bankAccountId: string; data: BankAccountUpdateData }) =>
      usersAPI.updateUserBankAccount(userId, bankAccountId, data),
    onSuccess: (data, { userId }) => {
      if (data.success) {
        toast.success('Bank account updated successfully');
        queryClient.invalidateQueries({ queryKey: ['user-bank-accounts', userId] });
      } else {
        toast.error('Failed to update bank account');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update bank account');
    },
  });
};

export const useDeleteUserBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, bankAccountId }: { userId: string; bankAccountId: string }) => usersAPI.deleteUserBankAccount(userId, bankAccountId),
    onSuccess: (data, { userId }) => {
      if (data.success) {
        toast.success('Bank account deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['user-bank-accounts', userId] });
      } else {
        toast.error('Failed to delete bank account');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete bank account');
    },
  });
};

// Password reset hooks
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: usersAPI.forgotPassword,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'OTP sent to your email address');
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: usersAPI.resetPassword,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password reset successfully');
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });
};

export const useGoogleLogin = () => {
  return useMutation({
    mutationFn: usersAPI.loginWithGoogle,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Google login successful');
      } else {
        toast.error('Google login failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Google login failed');
    },
  });
};

export default usersAPI;
