import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@lorrigo/ui/components';
import { api } from '@/lib/apis/axios';

export interface BulkUploadStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  progress: number;
  createdAt: string;
  completedAt?: string;
  reportPath?: string;
  errorMessage?: string;
}

export interface BulkUploadResponse {
  operationId: string;
  status: string;
  totalOrders: number;
}

const BULK_UPLOAD_QUERY_KEY = 'bulk-order-upload';

// Hook for initiating bulk upload
export const useBulkOrderUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ csvContent, headerMapping }: { csvContent: string; headerMapping: Record<string, string> }): Promise<BulkUploadResponse> => {
      const response = await api.post<BulkUploadResponse>('/orders/bulk-upload', { csvContent, headerMapping });

      return response;
    },
    onSuccess: (data) => {
      toast.success(`Bulk upload initiated! Operation ID: ${data.operationId}`);
      
      // Invalidate and refetch bulk upload status
      queryClient.invalidateQueries({ 
        queryKey: [BULK_UPLOAD_QUERY_KEY, data.operationId] 
      });
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
};

// Hook for getting bulk upload status
export const useBulkUploadStatus = (operationId: string | null, enabled = true) => {
  return useQuery({
    queryKey: [BULK_UPLOAD_QUERY_KEY, operationId],
    queryFn: async (): Promise<BulkUploadStatus> => {
      if (!operationId) {
        throw new Error('Operation ID is required');
      }

      const response = await fetch(`/api/v1/orders/bulk-upload/${operationId}/status`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch status');
      }

      return response.json();
    },
    enabled: enabled && !!operationId,
    refetchInterval: (query) => {
      // Stop polling if completed or failed
      if (query.state.data?.status === 'COMPLETED' || query.state.data?.status === 'FAILED') {
        return false;
      }
      // Poll every 2 seconds while processing
      return 2000;
    },
    staleTime: 1000, // Consider data stale after 1 second
  });
};

// Hook for downloading bulk upload report
export const useBulkUploadReport = () => {
  return useMutation({
    mutationFn: async (operationId: string): Promise<void> => {
      const response = await fetch(`/api/v1/orders/bulk-upload/${operationId}/report`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download report');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk_order_report_${operationId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Report downloaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Download failed: ${error.message}`);
    },
  });
};

// Hook for getting all user's bulk upload operations
export const useBulkUploadHistory = () => {
  return useQuery({
    queryKey: [BULK_UPLOAD_QUERY_KEY, 'history'],
    queryFn: async (): Promise<BulkUploadStatus[]> => {
      const response = await fetch('/api/v1/bulk-operations?type=BULK_ORDER_UPLOAD');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch history');
      }

      const result = await response.json();
      return result.data || [];
    },
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}; 