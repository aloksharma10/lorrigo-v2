import { api, apiDownload } from './axios';
import type { AxiosResponse } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/components/providers/token-provider';

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