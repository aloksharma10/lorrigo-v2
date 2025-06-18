'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useShippingOperations } from '@/lib/apis/shipment';
import { Button } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Progress } from '@lorrigo/ui/components';
import { Skeleton } from '@lorrigo/ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@lorrigo/ui/components';

export default function BulkOperationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const operationId = params.id as string;

  const { getBulkOperationStatus } = useShippingOperations();
  const { data, isLoading, isError, error, refetch } = getBulkOperationStatus(operationId);

  // Handle error
  useEffect(() => {
    if (isError) {
      toast.error('Failed to load operation details');
    }
  }, [isError]);

  // Get operation from data
  const operation = data?.data;

  // Calculate progress percentage
  const progress = operation?.status === 'COMPLETED'
    ? 100
    : operation
      ? Math.floor((operation.processed_count / operation.total_count) * 100) || 0
      : 0;

  // Get status badge color
  const getStatusColor = (status: string) => {
    const statusColorMap: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
    };
    return statusColorMap[status] || '';
  };

  // Get operation type label
  const getOperationTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'CREATE_SHIPMENT': 'Create Shipments',
      'SCHEDULE_PICKUP': 'Schedule Pickup',
      'CANCEL_SHIPMENT': 'Cancel Shipments',
    };
    return typeLabels[type] || type;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/seller/bulk-log')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bulk Operations
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            toast.success('Operation status refreshed');
          }}
          disabled={isLoading}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-[250px]" />
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : operation ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {getOperationTypeLabel(operation.type)}
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <Badge className={`${getStatusColor(operation.status)}`}>
                {operation.status}
              </Badge>
              <span className="text-muted-foreground">
                Operation Code: {operation.code}
              </span>
              <span className="text-muted-foreground">
                Created: {format(new Date(operation.created_at), 'PPP p')}
              </span>
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                Current status of the bulk operation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2" />
              <div className="mt-2 flex justify-between text-sm">
                <span>
                  {operation.processed_count} / {operation.total_count} processed
                </span>
                <span>{progress}%</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                    <h3 className="font-medium">Successful</h3>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{operation.success_count}</p>
                </div>

                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
                    <h3 className="font-medium">Failed</h3>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{operation.failed_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {operation.results && operation.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Operation Results</CardTitle>
                <CardDescription>
                  Detailed results for each processed item
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Item ID</th>
                        <th className="py-2 text-left">Status</th>
                        <th className="py-2 text-left">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* TODO: fix this */}
                      {operation.results.map((result: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{result.id}</td>
                          <td className="py-2">
                            <Badge variant={result.success ? 'success' : 'destructive'}>
                              {result.success ? 'Success' : 'Failed'}
                            </Badge>
                          </td>
                          <td className="py-2">{result.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-medium">Operation Not Found</h2>
          <p className="text-muted-foreground">
            The bulk operation you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/seller/bulk-log')}
          >
            Return to Bulk Operations
          </Button>
        </div>
      )}
    </div>
  );
} 