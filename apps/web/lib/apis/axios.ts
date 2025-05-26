import { apiClient } from '@/components/providers/token-provider';

// Generic API request function
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: any
): Promise<T> => {
  const response = await apiClient.request({
    method,
    url,
    data,
    ...config,
  });
  return response.data;
};

// Specific API methods
export const api = {
  get: <T>(url: string, config?: any) => apiRequest<T>('GET', url, undefined, config),
  post: <T>(url: string, data?: any, config?: any) => apiRequest<T>('POST', url, data, config),
  put: <T>(url: string, data?: any, config?: any) => apiRequest<T>('PUT', url, data, config),
  patch: <T>(url: string, data?: any, config?: any) => apiRequest<T>('PATCH', url, data, config),
  delete: <T>(url: string, config?: any) => apiRequest<T>('DELETE', url, undefined, config),
};
