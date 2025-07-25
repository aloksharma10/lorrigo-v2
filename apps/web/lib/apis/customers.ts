import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  _count: {
    orders: number;
  };
  created_at: string;
  address: {
    id: string;
    address: string;
    address_2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
    is_default: boolean;
  } | null;
}

// Direct API function for immediate use (without React Query hooks)
export const searchCustomers = async (query: string, signal?: AbortSignal): Promise<Customer[]> => {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await api.get<Customer[]>(
      `/customers/search?query=${encodeURIComponent(query)}`,
      { signal }
    );
    return response || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Request was aborted, don't log this as an error
      return [];
    }
    console.error('Error searching customers:', error);
    return [];
  }
};

// React Query hooks for customer operations
export const useCustomerOperations = () => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();
  // Fetch all customers with pagination
  const getCustomersQuery = (page = 1, limit = 10, search = '') =>
    useQuery({
      queryKey: ['customers', page, limit, search],
      queryFn: () =>
        api.get<any>(`/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
      staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
      enabled: isTokenReady,
    });

  // Get customer by ID
  const getCustomerByIdQuery = (id: string) =>
    useQuery({
      queryKey: ['customer', id],
      queryFn: () => api.get(`/customers/${id}`),
      enabled: !!id, // Only run if ID is provided
    });

  // Create customer
  const createCustomer = useMutation({
    mutationFn: (customerData: any) => api.post('/customers', customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Update customer
  const updateCustomer = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Delete customer
  const deleteCustomer = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Add address to customer
  const addCustomerAddress = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/customers/${id}/addresses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    getCustomersQuery,
    getCustomerByIdQuery,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomerAddress,
  };
};
