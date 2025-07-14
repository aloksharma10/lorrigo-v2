import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { ApiResponse } from '@/lib/type/response-types';
import { api as axios } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';
import { useDebounce } from '../hooks/use-debounce';

// Types
export interface BillingCycle {
  id: string;
  code: string;
  user_id: string;
  cycle_type: string;
  cycle_start_date: string;
  cycle_end_date: string;
  cycle_days: number;
  status: string;
  is_active: boolean;
  total_orders: number;
  total_amount: number;
  processed_orders: number;
  failed_orders: number;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
  };
  _count?: {
    billings: number;
  };
}

export interface Billing {
  id: string;
  code: string;
  order_id: string;
  awb: string | null;
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
  fw_charge: number;
  rto_charge: number;
  is_forward_applicable: boolean;
  is_rto_applicable: boolean;
  base_price: number;
  base_weight: number;
  increment_price: number;
  order_weight: number;
  order_zone: string | null;
  charged_zone: string | null;
  courier_name: string | null;
  billing_cycle_id: string | null;
  cycle_type: string;
  is_manual_billing: boolean;
  payment_status: string;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    code: string;
    user?: {
      name: string;
      email: string;
    };
    customer?: {
      name: string;
    };
  };
}

export interface BillingSummaryByUser {
  user_id: string;
  user_name: string;
  user_email: string;
  total_orders: number;
  total_billing_amount: number;
  paid_amount: number;
  pending_amount: number;
  disputed_amount: number;
}

export interface BillingSummary {
  total_amount: number;
  total_orders: number;
  users: BillingSummaryByUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WeightDispute {
  id: string;
  dispute_id: string;
  order_id: string;
  user_id: string;
  charged_order_box_height: number | null;
  charged_order_box_width: number | null;
  charged_order_box_length: number | null;
  charged_order_size_unit: string | null;
  original_weight: number;
  disputed_weight: number;
  final_weight: number | null;
  status: string;
  original_charges: number;
  revised_charges: number | null;
  dispute_raised_at: string;
  deadline_date: string | null;
  notification_sent_at: string | null;
  auto_resolved_at: string | null;
  seller_action_taken: boolean;
  seller_response: string | null;
  seller_evidence_urls: string[];
  forward_excess_amount: number;
  rto_excess_amount: number;
  total_disputed_amount: number;
  wallet_hold_applied: boolean;
  evidence_urls: string[];
  courier_name: string;
  courier_response: string | null;
  resolution: string | null;
  resolution_date: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    code: string;
    customer?: {
      name: string;
    };
    user_id: string;
    dimensions?: string;
    volumetric_weight?: number;
    shipment?: {
      id: string;
      awb: string;
      courier?: {
        id: string;
        name: string;
      };
    };
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  };
  user?: {
    name: string;
    email: string;
  };
}

export interface WalletBalance {
  balance: number;
  hold_amount: number;
  usable_amount: number;
  code: string;
}

export interface ManualBillingRequest {
  awbs?: string[];
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface ManualBillingParams {
  awbs?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface DisputeActionRequest {
  action: 'ACCEPT' | 'REJECT' | 'RAISE';
  resolution?: string;
  comment?: string;
  final_weight?: number;
  revised_charges?: number;
  status?: string;
}

export interface BillingCycleRequest {
  userId: string;
  cycleType: string;
  cycleDays: number;
  startDate?: string;
  weekDays?: number[];
  monthDay?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  awb?: string;
  sort?: string;
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

export interface BillingRecord {
  id: string;
  code: string;
  order_id: string;
  awb: string;
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
  fw_charge: number;
  rto_charge: number;
  is_forward_applicable: boolean;
  is_rto_applicable: boolean;
  base_price: number;
  base_weight: number;
  increment_price: number;
  order_weight: number;
  order_zone: string | null;
  charged_zone: string | null;
  courier_name: string | null;
  billing_cycle_id: string | null;
  cycle_type: string;
  is_manual_billing: boolean;
  payment_status: string;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  order: {
    order_type: string;
    order_number: string;
    code: string;
    user: {
      name: string;
      email: string;
    };
    customer: {
      name: string;
      phone: string;
      email: string;
    },
    hub: {
      name: string;
      address: {
        pincode: string;
      };
    };
  };
}

export interface BillingRecordsResponse {
  data: BillingRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}

// API Functions
const billingAPI = {
  // Billing Cycles
  getBillingCycles: async (params?: PaginationParams & { userId?: string }): Promise<PaginatedResponse<BillingCycle>> => {
    return await axios.get('/billing/cycles', { params });
  },

  // Billing History
  getBillingHistory: async (params?: PaginationParams & { billingCycleId?: string }): Promise<PaginatedResponse<Billing>> => {
    return await axios.get('/billing/history', { params });
  },

  // Manual Billing
  createManualBilling: async (request: ManualBillingRequest): Promise<ApiResponse> => {
    return await axios.post('/billing/manual', request);
  },

  // Billing Summary by Month
  getBillingSummaryByMonth: async (month: string, params?: PaginationParams): Promise<BillingSummary> => {
    return await axios.get(`/billing/summary/${month}`, { params });
  },

  // Billing Cycle Management
  createBillingCycle: async (request: BillingCycleRequest): Promise<ApiResponse> => {
    return await axios.post('/billing/cycles', request);
  },

  updateBillingCycle: async (id: string, request: Partial<BillingCycleRequest>): Promise<ApiResponse> => {
    return await axios.patch(`/billing/cycles/${id}`, request);
  },

  // Disputes
  getDisputes: async (params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<WeightDispute>> => {
    return await axios.get('/billing/disputes', { params });
  },

  actOnDispute: async (disputeId: string, request: DisputeActionRequest): Promise<ApiResponse> => {
    return await axios.post(`/billing/disputes/${disputeId}/action`, request);
  },

  resolveWeightDispute: async (disputeId: string, resolution: any): Promise<ApiResponse> => {
    return await axios.post(`/billing/disputes/${disputeId}/resolve`, resolution);
  },

  // CSV Upload for Weight Disputes
  uploadWeightDisputeCSV: async (formData: FormData): Promise<{ operationId: string }> => {
    return await axios.post('/bulk-operations/billing-weight-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // CSV Upload for Dispute Actions
  uploadDisputeActionsCSV: async (formData: FormData): Promise<{ operationId: string }> => {
    return await axios.post('/bulk-operations/dispute-actions-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get billing records for a specific user and month
  getUserBillingByMonth: async (userId: string, month: string, params?: PaginationParams): Promise<BillingRecordsResponse> => {
    return await axios.get(`/billing/history`, { 
      params: {
        ...params,
        userId,
        month
      }
    });
  },

  // Get billing records for the current user by month
  getCurrentUserBillingByMonth: async (month: string, params?: PaginationParams): Promise<BillingRecordsResponse> => {
    return await axios.get(`/billing/history`, { 
      params: {
        ...params,
        month
      }
    });
  },
};

interface BillingOperationsPaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  status?: string;
  limit?: number;
  search?: string; // AWB search, primarily for disputes
}

interface BillingOperationsParams {
  billingCycles?: BillingOperationsPaginationParams & { userId?: string; billingCycleId?: string; status?: string };
  billingHistory?: BillingOperationsPaginationParams & { userId?: string; billingCycleId?: string; status?: string };
  disputes?: BillingOperationsPaginationParams & { userId?: string; status?: string };
}

export function useBillingOperations({
  billingCycles = {},
  billingHistory = {},
  disputes = {},
}: BillingOperationsParams = {}) {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Debounce the search param for disputes to avoid excessive API calls during typing
  const debouncedDisputes = {
    ...disputes,
    search: disputes.search ? useDebounce(disputes.search, 300) : undefined,
  };

  // Fetch billing cycles
  const billingCyclesQuery = useQuery({
    queryKey: ['billing-cycles', billingCycles.page, billingCycles.pageSize, billingCycles.userId, billingCycles.billingCycleId, billingCycles.status],
    queryFn: () => billingAPI.getBillingCycles({
      page: billingCycles.page || 1,
      limit: billingCycles.pageSize || 10,
      userId: billingCycles.userId
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady && !!billingCycles.page, // Only fetch if page is defined and token is ready
  });

  // Fetch billing history
  const billingHistoryQuery = useQuery({
    queryKey: ['billing-history', billingHistory.page, billingHistory.pageSize, billingHistory.userId, billingHistory.billingCycleId, billingHistory.status],
    queryFn: () => billingAPI.getBillingHistory({
      page: billingHistory.page || 1,
      limit: billingHistory.pageSize || 10,
      billingCycleId: billingHistory.billingCycleId
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady && !!billingHistory.page, // Only fetch if page is defined and token is ready
  });

  // Fetch disputes
  const disputesQuery = useQuery({
    queryKey: ['disputes', debouncedDisputes.page, debouncedDisputes.pageSize, debouncedDisputes.userId, debouncedDisputes.status, debouncedDisputes.search],
    queryFn: () => billingAPI.getDisputes({
      page: debouncedDisputes.page || 1,
      limit: debouncedDisputes.pageSize || 10,
      status: debouncedDisputes.status,
      awb: debouncedDisputes.search
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: isTokenReady && !!debouncedDisputes.page, // Only fetch if page is defined and token is ready
  });

  // Fetch billing summary by month
  const getBillingSummaryByMonthQuery = (month: string, options: any = {}) => {
    return useQuery({
      queryKey: ['billing-summary', month, options],
      queryFn: () => billingAPI.getBillingSummaryByMonth(month, {
        page: (options.page + 1) || 1,
        limit: options.pageSize || 15
      }),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      enabled: isTokenReady && !!month,
    });
  };

  // Create manual billing
  const createManualBilling = useMutation({
    mutationFn: billingAPI.createManualBilling,
    onSuccess: (data) => {
      toast.success('Manual billing initiated successfully');
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['billing-history'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to initiate manual billing');
    },
  });

  // Process manual billing with specific parameters
  const processManualBilling = useMutation({
    mutationFn: ({ userId, params }: { userId: string; params: ManualBillingParams }) => {
      const request: ManualBillingRequest = { userId };
      
      if (params.awbs) {
        request.awbs = params.awbs;
      } else if (params.dateRange) {
        request.startDate = params.dateRange.from;
        request.endDate = params.dateRange.to;
      }
      
      return billingAPI.createManualBilling(request);
    },
    onSuccess: (data) => {
      toast.success('Manual billing processed successfully');
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['billing-history'] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process manual billing');
    },
  });
  
  // Generate manual billing (direct API call with awbs or date range)
  const generateManualBilling = useMutation({
    mutationFn: (params: ManualBillingRequest) => {
      return billingAPI.createManualBilling(params);
    },
    onSuccess: (data) => {
      toast.success('Manual billing generated successfully');
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['billing-history'] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate manual billing');
    },
  });

  // Create billing cycle
  const createBillingCycle = useMutation({
    mutationFn: billingAPI.createBillingCycle,
    onSuccess: (data) => {
      toast.success('Billing cycle created successfully');
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create billing cycle');
    },
  });

  // Update billing cycle
  const updateBillingCycle = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BillingCycleRequest> }) => 
      billingAPI.updateBillingCycle(id, data),
    onSuccess: (data) => {
      toast.success('Billing cycle updated successfully');
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update billing cycle');
    },
  });

  // Act on dispute
  const actOnDispute = useMutation({
    mutationFn: ({ disputeId, request }: { disputeId: string; request: DisputeActionRequest }) =>
      billingAPI.actOnDispute(disputeId, request),
    onSuccess: (data) => {
      toast.success('Dispute action completed successfully');
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process dispute action');
    },
  });

  // Resolve weight dispute
  const resolveWeightDispute = useMutation({
    mutationFn: ({ disputeId, resolution }: { disputeId: string; resolution: any }) =>
      billingAPI.resolveWeightDispute(disputeId, resolution),
    onSuccess: (data) => {
      toast.success('Weight dispute resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to resolve weight dispute');
    },
  });

  // Upload weight dispute CSV
  const uploadWeightDisputeCSV = (csvfile: File) => {
    const formData = new FormData();
    formData.append('file', csvfile);
    return billingAPI.uploadWeightDisputeCSV(formData);
  };

  // Upload dispute actions CSV
  const uploadDisputeActionsCSV = useMutation({
    mutationFn: billingAPI.uploadDisputeActionsCSV,
    onSuccess: (data) => {
      toast.success('Dispute actions CSV uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload dispute actions CSV');
    },
  });

  // Fetch billing records for a specific user by month
  const getUserBillingByMonthQuery = (userId: string, month: string, options: any = {}) => {
    return useQuery({
      queryKey: ['user-billing', userId, month, options],
      queryFn: () => billingAPI.getUserBillingByMonth(userId, month, {
        page: (options.page + 1) || 1,
        limit: options.pageSize || 15
      }),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      enabled: isTokenReady && !!userId && !!month,
    });
  };

  // Fetch billing records for the current user by month
  const getCurrentUserBillingQuery = (month: string, options: any = {}) => {
    return useQuery({
      queryKey: ['current-user-billing', month, options],
      queryFn: () => billingAPI.getCurrentUserBillingByMonth(month, {
        page: (options.page + 1) || 1,
        limit: options.pageSize || 15
      }),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      enabled: isTokenReady && !!month,
    });
  };

  return {
    billingCyclesQuery,
    billingHistoryQuery,
    disputesQuery,
    getBillingSummaryByMonthQuery,
    getUserBillingByMonthQuery,
    getCurrentUserBillingQuery,
    createManualBilling,
    processManualBilling,
    generateManualBilling,
    createBillingCycle,
    updateBillingCycle,
    actOnDispute,
    resolveWeightDispute,
    uploadWeightDisputeCSV,
    uploadDisputeActionsCSV,
  };
}

export default billingAPI;
