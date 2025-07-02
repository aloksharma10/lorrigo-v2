import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';

export interface Product {
  id: string;
  name: string;
  selling_price?: number;
  price: number; // alias for selling_price
  hsnCode?: string;
  hsn?: string; // backend returns hsn
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  tax_rate?: number;
  category?: string;
  created_at?: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Direct API function for immediate use (without React Query hooks)
export const searchProducts = async (query: string, signal?: AbortSignal): Promise<Product[]> => {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await api.get<Product[]>(
      `/products/search?query=${encodeURIComponent(query)}`,
      { signal }
    );
    return response || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Request was aborted, don't log this as an error
      return [];
    }
    console.error('Error searching products:', error);
    return [];
  }
};

// React Query hooks for product operations
export const useProductOperations = () => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();
  // Fetch all products with pagination
  const getProductsQuery = (page = 1, limit = 10, search = '') =>
    useQuery<ProductsResponse>({
      queryKey: ['products', page, limit, search],
      queryFn: () =>
        api.get<any>(`/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
      staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
      enabled: isTokenReady,
    });

  // Get product by ID
  const getProductByIdQuery = (id: string) =>
    useQuery({
      queryKey: ['product', id],
      queryFn: () => api.get(`/products/${id}`),
      enabled: !!id && isTokenReady, // Only run if ID is provided
    });

  // Create product
  const createProduct = useMutation({
    mutationFn: (productData: any) => api.post('/products', productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Update product
  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    getProductsQuery,
    getProductByIdQuery,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
