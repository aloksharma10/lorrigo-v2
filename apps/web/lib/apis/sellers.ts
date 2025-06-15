import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './axios';

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
    const response = await api.get<Seller[]>(`/sellers/search?query=${encodeURIComponent(query)}`, { signal });
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
  // Fetch all sellers with pagination
  const getSellersQuery = (page = 1, limit = 10, search = '') => 
    useQuery({
      queryKey: ['sellers', page, limit, search],
      queryFn: () => api.get(`/sellers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
      staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
    });

  // Get seller by ID
  const getSellerByIdQuery = (id: string) => 
    useQuery({
      queryKey: ['seller', id],
      queryFn: () => api.get(`/sellers/${id}`),
      enabled: !!id, // Only run if ID is provided
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
