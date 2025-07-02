'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/components/providers/token-provider';
import { useSession } from 'next-auth/react';
import { api } from './axios';
import { AxiosResponse } from 'axios';

// Fetch user profile
export const useUserProfile = () => {
  const { status } = useSession();
  const { isTokenReady } = useAuthToken();

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await api.get<{ id: string; name: string; email: string }>('/auth/me');
      return response;
    },
    enabled: status === 'authenticated' && isTokenReady, // Only run when authenticated AND token is ready
    retry: 0, // Disable retries to avoid multiple requests on 401
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
};

// Update user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; name: string; email: string }) =>
      api.put(`/users/${data.userId}`, { name: data.name, email: data.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

// Wallet operations
export const useWalletOperations = () => {
  const queryClient = useQueryClient();
  const { isTokenReady } = useAuthToken();
  const { status } = useSession();

  // Get wallet balance
  const getWalletBalance = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      const response = await api.get<{ balance: number }>('/transactions/wallet/balance');
      return response;
    },
    enabled: status === 'authenticated' && isTokenReady,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });

  // Recharge wallet
  const rechargeWallet = useMutation({
    mutationFn: async (data: { amount: number; redirectUrl: string }) => {
      const response = await api.post<{
        valid: boolean;
        message: string;
        merchantTransactionId: string;
        url: string;
      }>('/transactions/wallet/recharge', {
        amount: data.amount,
        origin: window.location.origin, // Using origin similar to old code
        redirectUrl: data.redirectUrl,
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate wallet balance query to refetch after successful recharge
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
    },
  });

  // Get transaction history
  const getTransactionHistory = ({ page, limit }: { page: number; limit: number }) => {
    return useQuery({
      queryKey: ['wallet', 'transactions'],
      queryFn: async () => {
        const response = await api.get<{ transactions: any[] }>('/transactions/history', {
          params: { page, limit },
        });
        return response;
      },
      enabled: status === 'authenticated' && isTokenReady,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Verify wallet recharge (can be called from callback page)
  const verifyWalletRecharge = useMutation({
    mutationFn: async (data: { merchantTransactionId: string }) => {
      // Using GET with query params like in the old code
      const response = await api.get<{ valid: boolean; message: string }>(
        `/transactions/wallet/verify`,
        {
          params: data,
        }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });

  // Refetch failed transactions (from old code)
  const refetchFailedTransactions = useMutation({
    mutationFn: async () => {
      const response = await api.get('/transactions/refetch-failed');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });

  // Pay invoice (from old code)
  const payInvoice = useMutation({
    mutationFn: async (data: { amount: number; invoiceId: string }) => {
      const response = await api.post('/transactions/invoice/pay', {
        amount: data.amount,
        invoiceId: data.invoiceId,
        origin: window.location.origin,
      });
      return response;
    },
  });

  // Confirm invoice payment (from old code)
  const confirmInvoicePayment = useMutation({
    mutationFn: async (data: { merchantTransactionId: string; invoiceId: string }) => {
      const response = await api.get(`/transactions/invoice/verify`, {
        params: data,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  return {
    getWalletBalance,
    rechargeWallet,
    getTransactionHistory,
    verifyWalletRecharge,
    refetchFailedTransactions,
    payInvoice,
    confirmInvoicePayment,
  };
};
