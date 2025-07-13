import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export interface Seller {
  id: string;
  name: string;
  gstNo?: string;
  address?: string;
  contactNumber?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Direct API function for immediate use (without React Query hooks)
export const searchSellers = async (query: string, signal?: AbortSignal): Promise<Seller[]> => {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await api.get<Seller[]>(`/sellers/search?query=${encodeURIComponent(query)}`, {
      signal,
    });
    return response || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Request was aborted, don't log this as an error
      return [];
    }
    console.error('Error searching sellers:', error);
    return [];
  }
};

// React Query hooks for seller operations
export const useSellerOperations = () => {

  const {isTokenReady} = useAuthToken();
  // Fetch all sellers with pagination
  const getSellersQuery = (page = 1, limit = 10, search = '', role = 'SELLER') =>
    useQuery({
      queryKey: ['sellers', page, limit, search, role],
      queryFn: () =>
        api.get<any>(`/sellers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&role=${role}`),
      staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
      enabled: isTokenReady,
    });

  // Get seller by ID
  const getSellerByIdQuery = (id: string) =>
    useQuery({
      queryKey: ['seller', id],
      queryFn: () => api.get(`/sellers/${id}`),
      staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
      enabled: isTokenReady && !!id, // Only run if ID is provided
    });

  // Create seller
  const createSeller = useMutation({
    mutationFn: (sellerData: any) => api.post('/sellers', sellerData),
  });

  // Update seller
  const updateSeller = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/sellers/${id}`, data),
  });

  // Delete seller
  const deleteSeller = useMutation({
    mutationFn: (id: string) => api.delete(`/sellers/${id}`),
  });

  return {
    getSellersQuery,
    getSellerByIdQuery,
    createSeller,
    updateSeller,
    deleteSeller,
  };
};
