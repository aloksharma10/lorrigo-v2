import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { ApiResponse } from '@/lib/type/response-types';
import { api as axios } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

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
    code: string;
    customer?: {
      name: string;
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

export interface DisputeActionRequest {
  action: 'ACCEPT' | 'REJECT' | 'RAISE';
  comment?: string;
  finalWeight?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
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

  // Disputes
  getDisputes: async (params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<WeightDispute>> => {
    return await axios.get('/billing/disputes', { params });
  },

  actOnDispute: async (disputeId: string, request: DisputeActionRequest): Promise<ApiResponse> => {
    return await axios.post(`/billing/disputes/${disputeId}/action`, request);
  },

  // Wallet
  getWalletBalance: async (userId?: string): Promise<{ success: boolean; wallet: WalletBalance }> => {
    return await axios.get('/billing/wallet/balance', { 
      params: userId ? { userId } : undefined 
    });
  },

  // CSV Upload for Weight Disputes
  uploadWeightDisputeCSV: async (csvData: Array<{
    AWB: string;
    Charged_Weight: number;
    evidence_url?: string;
  }>): Promise<{ operationId: string }> => {
    return await axios.post('/bulk-operations/weight-charges', { csvData });
  },

  // CSV Upload for Dispute Actions
  uploadDisputeActionsCSV: async (csvData: Array<{
    AWB: string;
    Action: 'ACCEPT' | 'REJECT' | 'RAISE';
    final_weight?: number;
    comment?: string;
  }>): Promise<{ operationId: string }> => {
    return await axios.post('/bulk-operations/dispute-actions', { csvData });
  },
};

// Comprehensive hook for billing operations
export function useBillingOperations(params: PaginationParams & { userId?: string, billingCycleId?: string, status?: string } = {}) {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Fetch billing cycles
  const billingCyclesQuery = useQuery({
    queryKey: ['billing-cycles', params],
    queryFn: () => billingAPI.getBillingCycles(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady,
  });

  // Fetch billing history
  const billingHistoryQuery = useQuery({
    queryKey: ['billing-history', params],
    queryFn: () => billingAPI.getBillingHistory(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isTokenReady,
  });

  // Fetch disputes
  const disputesQuery = useQuery({
    queryKey: ['disputes', params],
    queryFn: () => billingAPI.getDisputes(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: isTokenReady,
  });

  // Fetch wallet balance
  const walletBalanceQuery = useQuery({
    queryKey: ['wallet-balance', params.userId],
    queryFn: () => billingAPI.getWalletBalance(params.userId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: isTokenReady,
  });

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

  // Upload weight dispute CSV
  const uploadWeightDisputeCSV = useMutation({
    mutationFn: billingAPI.uploadWeightDisputeCSV,
    onSuccess: (data) => {
      toast.success('Weight dispute CSV uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload weight dispute CSV');
    },
  });

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

  return {
    billingCyclesQuery,
    billingHistoryQuery,
    disputesQuery,
    walletBalanceQuery,
    createManualBilling,
    actOnDispute,
    uploadWeightDisputeCSV,
    uploadDisputeActionsCSV,
  };
}

export default billingAPI;