'use client';

import { useEffect, useState } from 'react';
import { Button, Progress } from '@lorrigo/ui/components';
import { RefreshCw, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useOrderOperations } from '@/lib/apis/order';

export default function BulkUploadStatusWidget() {
  const [operationId, setOperationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bulkUploadActive');
  });

  // Listen for storage changes (in case user starts/stops upload in another tab)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'bulkUploadActive') {
        setOperationId(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { bulkOrderUploadStatusQuery } = useOrderOperations();
  const statusQuery = bulkOrderUploadStatusQuery(operationId || '');
  const status = statusQuery.data?.data;
  const progress = statusQuery.data?.progress || 0;

  // Hide widget if no active operation
  if (!operationId) return null;

  const handleClose = () => {
    localStorage.removeItem('bulkUploadActive');
    setOperationId(null);
  };

  const getStatusIcon = (state?: string) => {
    switch (state) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PROCESSING':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon(status?.status)}
          <span className="text-sm font-medium">Bulk Upload</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Progress value={progress} className="h-2 mb-1" />
      <p className="text-xs text-muted-foreground">
        {status?.status === 'COMPLETED'
          ? 'Completed'
          : `${progress}%`}
      </p>
    </div>
  );
} 