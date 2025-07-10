import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

// Types
export interface BillingRecord {
  id: string;
  code: string;
  order_id: string;
  billing_date: string;
  billing_month: string;
  billing_amount: number;
  charged_weight: number;
  original_weight: number;
  weight_difference: number;
  has_weight_dispute: boolean;
  fw_excess_charge: number;
  rto_excess_charge: number;
  zone_change_charge: number;
  cod_charge: number;
  is_forward_applicable: boolean;
  is_rto_applicable: boolean;
  base_price: number;
  base_weight: number;
  increment_price: number;
  order_weight: number;
  order_zone: string | null;
  charged_zone: string | null;
  courier_name: string | null;
  cycle_type: string | null;
  is_manual_billing: boolean;
  is_processed: boolean;
  payment_status: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  order: {
    order_number: string;
    customer: {
      name: string;
      phone: string;
      email: string;
    };
    hub: {
      name: string;
    };
    shipment: {
      awb: string;
      courier: {
        name: string;
      };
    };
    weight_dispute?: {
      id: string;
      dispute_id: string;
      status: string;
      original_weight: number;
      disputed_weight: number;
      final_weight?: number;
      evidence_urls: string[];
      courier_response?: string;
      resolution?: string;
      resolution_date?: string;
      resolved_by?: string;
    } | null;
  };
}

export interface BillingSummaryByUser {
  user_id: string;
  user_name: string;
  user_email: string;
  total_orders: number;
  total_billing_amount: number;
  pending_amount: number;
  paid_amount: number;
  disputed_amount: number;
}

export interface BillingSummary {
  billing_month: string;
  users: BillingSummaryByUser[];
  total_amount: number;
  total_orders: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface UserBillingData {
  billing_month: string;
  user_id: string;
  records: BillingRecord[];
  summary: {
    total_orders: number;
    total_billing_amount: number;
    pending_amount: number;
    paid_amount: number;
    disputed_amount: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface BillingUploadResult {
  success: boolean;
  message: string;
  totalRecords: number;
  processedCount: number;
  errorCount: number;
  disputeCount?: number;
  bulkOperationId?: string;
}

export interface WeightDispute {
  id: string;
  dispute_id: string;
  order_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED';
  original_weight: number;
  disputed_weight: number;
  final_weight?: number;
  courier_name: string;
  original_charges: number;
  revised_charges?: number;
  evidence_urls: string[];
  courier_response?: string;
  resolution?: string;
  resolution_date?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
  order: {
    order_number: string;
    customer: {
      name: string;
      phone: string;
    };
    shipment: {
      awb: string;
    };
  };
}

export interface BillingCycle {
  id: string;
  code: string;
  user_id: string;
  cycle_type: 'AUTOMATIC' | 'MANUAL' | 'CUSTOM';
  cycle_days: number;
  cycle_start_date: string;
  cycle_end_date: string;
  next_cycle_date?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  is_active: boolean;
  total_orders: number;
  total_amount: number;
  processed_orders: number;
  failed_orders: number;
  created_at: string;
  updated_at: string;
}

export interface BulkOperation {
  id: string;
  type: string;
  status: string;
  code: string;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  results?: string;
  report_path?: string;
  file_path?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingParams {
  page?: number;
  pageSize?: number;
  sort?: { id: string; desc: boolean }[];
  filters?: { id: string; value: any }[];
  globalFilter?: string;
  dateRange?: { from: Date; to: Date };
  month?: string;
  userId?: string;
}

export interface ManualBillingParams {
  awbs?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

// Direct API functions for immediate use (without React Query hooks)

// Upload billing CSV (Admin only)
export const uploadBillingCSVAPI = async (file: File): Promise<BillingUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<{ success: boolean; data: BillingUploadResult }>(
    '/billing/upload-csv',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// Process manual billing (Admin only)
export const processManualBillingAPI = async (
  userId: string,
  params: ManualBillingParams
): Promise<BillingUploadResult> => {
  const response = await api.post<{ success: boolean; data: BillingUploadResult }>(
    `/billing/manual/${userId}`,
    params
  );

  return response.data;
};

// Create billing cycle (Admin only)
export const createBillingCycleAPI = async (
  userId: string,
  cycleType: string,
  cycleDays: number = 30
): Promise<{ billingCycleId: string; message: string }> => {
  const response = await api.post<{
    success: boolean;
    data: { billingCycleId: string; message: string };
  }>(`/billing/cycle/${userId}`, { cycleDays, cycleType });

  return response.data;
};

// Get billing summary by month (Admin)
export const getBillingSummaryByMonthAPI = async (
  month: string,
  params: BillingParams = {}
): Promise<BillingSummary> => {
  const { page = 0, pageSize = 15 } = params;

  const queryParams = new URLSearchParams({
    page: (page + 1).toString(), // Backend expects 1-based page indexing
    limit: pageSize.toString(),
  });

  const response = await api.get<{ success: boolean; data: BillingSummary }>(
    `/billing/summary/${month}?${queryParams}`
  );
  return response.data;
};

// Get user billing by month (Admin/User)
export const getUserBillingByMonthAPI = async (
  userId: string,
  month: string,
  params: BillingParams = {}
): Promise<UserBillingData> => {
  const { page = 0, pageSize = 15, globalFilter, sort } = params;

  const queryParams = new URLSearchParams({
    page: (page + 1).toString(), // Backend expects 1-based page indexing
    limit: pageSize.toString(),
  });

  if (globalFilter) {
    queryParams.append('search', globalFilter);
  }

  if (sort && sort.length > 0) {
    queryParams.append('sort', JSON.stringify(sort));
  }

  const response = await api.get<{ success: boolean; data: UserBillingData }>(
    `/billing/user/${userId}/${month}?${queryParams}`
  );
  return response.data;
};

// Get current user billing (for sellers)
export const getCurrentUserBillingAPI = async (
  month: string,
  params: BillingParams = {}
): Promise<UserBillingData> => {
  const { page = 0, pageSize = 15, globalFilter, sort } = params;

  const queryParams = new URLSearchParams({
    page: (page + 1).toString(), // Backend expects 1-based page indexing
    limit: pageSize.toString(),
  });

  if (globalFilter) {
    queryParams.append('search', globalFilter);
  }

  if (sort && sort.length > 0) {
    queryParams.append('sort', JSON.stringify(sort));
  }

  const response = await api.get<{ success: boolean; data: UserBillingData }>(
    `/billing/my/${month}?${queryParams}`
  );
  return response.data;
};

// Get available billing months
export const getAvailableBillingMonthsAPI = async (): Promise<string[]> => {
  const response = await api.get<{ success: boolean; data: string[] }>('/billing/months');
  return response.data;
};

// Get bulk operation status
export const getBulkOperationStatusAPI = async (operationId: string): Promise<BulkOperation> => {
  const response = await api.get<{ success: boolean; data: BulkOperation }>(
    `/billing/operation/${operationId}`
  );
  return response.data;
};

// Weight dispute APIs
export const getWeightDisputesAPI = async (
  params: BillingParams = {}
): Promise<{
  disputes: WeightDispute[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
}> => {
  const { page = 0, pageSize = 15, globalFilter, sort } = params;

  const queryParams = new URLSearchParams({
    page: (page + 1).toString(),
    limit: pageSize.toString(),
  });

  if (globalFilter) {
    queryParams.append('search', globalFilter);
  }

  if (sort && sort.length > 0) {
    queryParams.append('sort', JSON.stringify(sort));
  }

  const response = await api.get<{ success: boolean; data: any }>(
    `/weight-disputes?${queryParams}`
  );
  return response.data;
};

export const resolveWeightDisputeAPI = async (
  disputeId: string,
  resolution: {
    status: 'ACCEPTED' | 'REJECTED' | 'RESOLVED';
    final_weight?: number;
    resolution: string;
    revised_charges?: number;
  }
): Promise<WeightDispute> => {
  const response = await api.put<{ success: boolean; data: WeightDispute }>(
    `/weight-disputes/${disputeId}/resolve`,
    resolution
  );
  return response.data;
};

// Billing cycle APIs
export const getBillingCyclesAPI = async (userId?: string): Promise<BillingCycle[]> => {
  const queryParams = userId ? `?userId=${userId}` : '';
  const response = await api.get<{ success: boolean; data: BillingCycle[] }>(
    `/billing-cycles${queryParams}`
  );
  return response.data;
};

export const updateBillingCycleAPI = async (
  cycleId: string,
  updates: Partial<BillingCycle>
): Promise<BillingCycle> => {
  const response = await api.put<{ success: boolean; data: BillingCycle }>(
    `/billing-cycles/${cycleId}`,
    updates
  );
  return response.data;
};

// Main React Query hook for all billing operations
export const useBillingOperations = () => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Upload billing CSV mutation
  const uploadBillingCSV = useMutation({
    mutationFn: uploadBillingCSVAPI,
    onSuccess: (data) => {
      toast.success('Billing CSV uploaded successfully');
      // Invalidate billing-related queries
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload billing CSV');
    },
  });

  // Process manual billing mutation
  const processManualBilling = useMutation({
    mutationFn: ({ userId, params }: { userId: string; params: ManualBillingParams }) =>
      processManualBillingAPI(userId, params),
    onSuccess: (data) => {
      toast.success(`Manual billing processed: ${data.processedCount} records`);
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process manual billing');
    },
  });

  // Create billing cycle mutation
  const createBillingCycle = useMutation({
    mutationFn: ({
      userId,
      cycleType,
      cycleDays,
    }: {
      userId: string;
      cycleType: string;
      cycleDays: number;
    }) => createBillingCycleAPI(userId, cycleType, cycleDays),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create billing cycle');
    },
  });

  // Update billing cycle mutation
  const updateBillingCycle = useMutation({
    mutationFn: ({ cycleId, updates }: { cycleId: string; updates: Partial<BillingCycle> }) =>
      updateBillingCycleAPI(cycleId, updates),
    onSuccess: (data) => {
      toast.success('Billing cycle updated successfully');
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update billing cycle');
    },
  });

  // Resolve weight dispute mutation
  const resolveWeightDispute = useMutation({
    mutationFn: ({ disputeId, resolution }: { disputeId: string; resolution: any }) =>
      resolveWeightDisputeAPI(disputeId, resolution),
    onSuccess: () => {
      toast.success('Weight dispute resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['weight-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve weight dispute');
    },
  });

  // Get billing summary by month query (Admin)
  const getBillingSummaryByMonthQuery = (month: string, params: BillingParams = {}) =>
    useQuery({
      queryKey: ['billing', 'summary', month, params],
      queryFn: () => getBillingSummaryByMonthAPI(month, params),
      enabled: !!month && isTokenReady,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });

  // Get user billing by month query
  const getUserBillingByMonthQuery = (userId: string, month: string, params: BillingParams = {}) =>
    useQuery({
      queryKey: ['billing', 'user', userId, month, params],
      queryFn: () => getUserBillingByMonthAPI(userId, month, params),
      enabled: !!userId && !!month && isTokenReady,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });

  // Get current user billing query (for sellers)
  const getCurrentUserBillingQuery = (month: string, params: BillingParams = {}) =>
    useQuery({
      queryKey: ['billing', 'me', month, params],
      queryFn: () => getCurrentUserBillingAPI(month, params),
      enabled: !!month && isTokenReady,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });

  // Get available billing months query
  const getAvailableBillingMonthsQuery = () =>
    useQuery({
      queryKey: ['billing', 'months'],
      queryFn: getAvailableBillingMonthsAPI,
      enabled: isTokenReady,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    });

  // Get bulk operation status query
  const getBulkOperationStatusQuery = (operationId: string) =>
    useQuery({
      queryKey: ['billing', 'operation', operationId],
      queryFn: () => getBulkOperationStatusAPI(operationId),
      enabled: !!operationId && isTokenReady,
      refetchInterval: 2000, // Poll every 2 seconds
      refetchIntervalInBackground: true,
    });

  // Get weight disputes query
  const getWeightDisputesQuery = (params: BillingParams = {}) =>
    useQuery({
      queryKey: ['weight-disputes', params],
      queryFn: () => getWeightDisputesAPI(params),
      enabled: isTokenReady,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    });

  // Get billing cycles query
  const getBillingCyclesQuery = (userId?: string) =>
    useQuery({
      queryKey: ['billing-cycles', userId],
      queryFn: () => getBillingCyclesAPI(userId),
      enabled: isTokenReady,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });

  return {
    // Mutations
    uploadBillingCSV,
    processManualBilling,
    createBillingCycle,
    updateBillingCycle,
    resolveWeightDispute,

    // Queries
    getBillingSummaryByMonthQuery,
    getUserBillingByMonthQuery,
    getCurrentUserBillingQuery,
    getAvailableBillingMonthsQuery,
    getBulkOperationStatusQuery,
    getWeightDisputesQuery,
    getBillingCyclesQuery,
  };
};

// Export individual hooks for backward compatibility (deprecated - use useBillingOperations instead)
export const useUploadBillingCSV = () => {
  const { uploadBillingCSV } = useBillingOperations();
  return uploadBillingCSV;
};

export const useBillingSummaryByMonth = (month: string, params: BillingParams = {}) => {
  const { getBillingSummaryByMonthQuery } = useBillingOperations();
  return getBillingSummaryByMonthQuery(month, params);
};

export const useUserBillingByMonth = (
  userId: string,
  month: string,
  params: BillingParams = {}
) => {
  const { getUserBillingByMonthQuery } = useBillingOperations();
  return getUserBillingByMonthQuery(userId, month, params);
};

export const useCurrentUserBilling = (month: string, params: BillingParams = {}) => {
  const { getCurrentUserBillingQuery } = useBillingOperations();
  return getCurrentUserBillingQuery(month, params);
};

export const useAvailableBillingMonths = () => {
  const { getAvailableBillingMonthsQuery } = useBillingOperations();
  return getAvailableBillingMonthsQuery();
};

export const useWeightDisputes = (params: BillingParams = {}) => {
  const { getWeightDisputesQuery } = useBillingOperations();
  return getWeightDisputesQuery(params);
};

export const useBillingCycles = (userId?: string) => {
  const { getBillingCyclesQuery } = useBillingOperations();
  return getBillingCyclesQuery(userId);
};
