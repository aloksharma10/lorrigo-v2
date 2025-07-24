import { api, apiDownload } from './axios';
import type { AxiosResponse } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/components/providers/token-provider';
import { toast } from '@lorrigo/ui/components/sonner';

/**
 * Seller: Fetch own remittances with filters
 */
export const fetchSellerRemittances = (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  remittanceId?: string;
  name?: string;
  amount?: number;
  from?: string;
  to?: string;
  [key: string]: any;
}) => api.get('/remittance', { params });

/**
 * Admin: Fetch all remittances with filters
 */
export const fetchAdminRemittances = (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  remittanceId?: string;
  name?: string;
  amount?: number;
  from?: string;
  to?: string;
  [key: string]: any;
}) => api.get('/remittance', { params });

/**
 * Seller: Fetch remittance by ID
 */
export const fetchSellerRemittanceById = (id: string) =>
  api.get(`/remittance/${id}`);

/**
 * Admin: Fetch remittance by ID
 */
export const fetchAdminRemittanceById = (id: string) =>
  api.get<any>(`/remittance/${id}`);

/**
 * Export remittances (admin or seller, based on endpoint)
 * @param params - All filters and 'type' (csv|xlsx)
 */
export const exportAdminRemittances = (params: any): Promise<AxiosResponse<Blob>> =>
  apiDownload.get('/export/remittances', { params });

export const exportSellerRemittances = (params: any): Promise<AxiosResponse<Blob>> =>
  apiDownload.get('/remittance/export', { params });

/**
 * Export remittance detail (admin or seller, based on endpoint)
 * @param id - Remittance ID
 * @param type - 'csv' or 'xlsx'
 */
export const exportAdminRemittanceDetail = (id: string, type: 'csv' | 'xlsx' = 'csv'): Promise<AxiosResponse<Blob>> =>
  apiDownload.get(`/remittance/export/${id}`, { params: { type } });

export const exportSellerRemittanceDetail = (id: string, type: 'csv' | 'xlsx' = 'csv'): Promise<AxiosResponse<Blob>> =>
  apiDownload.get(`/remittance/${id}/export`, { params: { type } });

/**
 * Seller: Fetch own bank accounts
 */
export const fetchUserBankAccounts = (params: { search?: string, page?: number; limit?: number } = {}) =>
  api.get('/remittance/bank-accounts', { params });

/**
 * Seller: Select a bank account for remittance
 */
export const useSelectUserBankAccount = () =>{
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/remittance/bank-accounts/select', data).then((res: any) => res),
    onSuccess: (data: any) => {
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['seller-remittances'] });
      queryClient.invalidateQueries({ queryKey: ['user-bank-accounts'] });
    },
    onError: (error: any) => {
      toast.error((error as Error).message);
    },
  });
}
// React Query hooks for remittance list/detail (admin & seller)
export function useSellerRemittances(params: any) {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['seller-remittances', params],
    queryFn: () => fetchSellerRemittances(params).then((res: any) => res),
    enabled: isTokenReady,
  });
}

export function useAdminRemittances(params: any) {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['admin-remittances', params],
    queryFn: () => fetchAdminRemittances(params).then((res: any) => res),
    enabled: isTokenReady,
  });
}

export function useAddBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/remittance/bank-accounts', data).then((res: any) => res),
    onSuccess: (data: any) => {
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['user-bank-accounts'] });
    },
    onError: (error: any) => {
      toast.error((error as Error).message);
    },
  });
}

export function useSellerRemittanceDetail(id: string) {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['seller-remittance-detail', id],
    queryFn: () => fetchSellerRemittanceById(id).then((res: any) => res),
    enabled: !!id && isTokenReady,
  });
}

export function useAdminRemittanceDetail(id: string) {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['admin-remittance-detail', id],
    queryFn: () => fetchAdminRemittanceById(id).then((res: any) => res),
    enabled: !!id && isTokenReady,
  });
}

/**
 * React Query hook: Fetch user bank accounts
 */
export function useUserBankAccounts(params: { search?: string, page?: number; limit?: number } = {}) {
  const { isTokenReady } = useAuthToken();
  return useQuery({
    queryKey: ['user-bank-accounts', params],
    queryFn: () => fetchUserBankAccounts(params).then((res: any) => res),
    enabled: isTokenReady,
  });
} 

export function useVerifyBankAccount() {
  return useMutation({
    mutationFn: (data: any) => api.put(`/remittance/bank-accounts/${data.bankAccountId}/verify`, data).then((res: any) => res),
  });
}