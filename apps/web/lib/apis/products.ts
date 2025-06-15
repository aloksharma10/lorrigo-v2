import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './axios';

export interface Product {
  id: string;
  name: string;
  price: number;
  hsnCode?: string;
}

// Direct API function for immediate use (without React Query hooks)
export const searchProducts = async (query: string, signal?: AbortSignal): Promise<Product[]> => {
  if (!query || query.length < 2) {
    return [];
  }
  
  try {
    const response = await api.get<Product[]>(`/products/search?query=${encodeURIComponent(query)}`, { signal });
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
  // Fetch all products with pagination
  const getProductsQuery = (page = 1, limit = 10, search = '') => 
    useQuery({
      queryKey: ['products', page, limit, search],
      queryFn: () => api.get(`/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
      staleTime: 1000 * 60 * 5, // 5 minutes: data is considered fresh
    });

  // Get product by ID
  const getProductByIdQuery = (id: string) => 
    useQuery({
      queryKey: ['product', id],
      queryFn: () => api.get(`/products/${id}`),
      enabled: !!id, // Only run if ID is provided
    });

  // Create product
  const createProduct = useMutation({
    mutationFn: (productData: any) => api.post('/products', productData),
  });

  // Update product
  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/products/${id}`, data),
  });

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
  });

  return {
    getProductsQuery,
    getProductByIdQuery,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
