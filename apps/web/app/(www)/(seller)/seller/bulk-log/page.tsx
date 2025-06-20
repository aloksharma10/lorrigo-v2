'use client';

import React, { useState } from 'react';
import { useShippingOperations } from '@/lib/apis/shipment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Card, CardContent, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { format } from 'date-fns';
import { Download, FileText, FileCheck, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@lorrigo/ui/components';
import { AxiosResponse } from 'axios';
// import { DataTableDateRangePicker  } from '@lorrigo/ui/components';

// Define TypeScript interface for bulk operation
interface BulkOperation {
  id: string;
  code: string;
  type: string;
  status: string;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export default function BulkLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([
    undefined,
    undefined,
  ]);
  const [type, setType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const shippingOps = useShippingOperations();
  const { data: operationsData, isLoading, error } = shippingOps.getAllBulkOperations({ 
    page, 
    pageSize,
    type,
    status,
    dateRange: dateRange[0] && dateRange[1] ? dateRange as [Date, Date] : undefined
  });


  const handleDownload = async (operationId: string, type: 'report' | 'file') => {
    try {
      setDownloading(`${operationId}-${type}`);
      const response = await shippingOps.downloadBulkOperationFile(operationId, type);
      
      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers['content-disposition'];

      console.log(response.headers);

      let filename = `bulk_operation_${type === 'report' ? 'report.csv' : 'file.pdf'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create a blob from the response data
      const blob = new Blob([response.data as BlobPart], { 
        type: type === 'report' ? 'text/csv' : 'application/pdf' 
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success(`${type === 'report' ? 'Report' : 'File'} downloaded successfully`);
    } catch (error: any) {
      toast.error(`Failed to download ${type}: ${error.message || 'Unknown error'}`);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getOperationTypeLabel = (type: string) => {
    switch (type) {
      case 'CREATE_SHIPMENT':
        return 'Create Shipments';
      case 'SCHEDULE_PICKUP':
        return 'Schedule Pickups';
      case 'CANCEL_SHIPMENT':
        return 'Cancel Shipments';
      case 'EDIT_PICKUP_ADDRESS':
        return 'Edit Pickup Address';
      case 'DOWNLOAD_LABEL':
        return 'Download Labels';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const handleFilter = (type?: string, status?: string) => {
    setType(type);
    setStatus(status);
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="mx-auto py-6 w-full">
      <Card className='w-full'>
        <CardHeader className="w-full flex flex-row items-center justify-between">
          <CardTitle>Bulk Operations Log</CardTitle>
          <div className="flex items-center space-x-2">
            {/* <DataTableDateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filter by date"
              align="end"
            /> */}
            <select 
              className="border rounded p-2 text-sm"
              value={type || ''}
              onChange={(e) => handleFilter(e.target.value || undefined, status)}
            >
              <option value="">All Types</option>
              <option value="CREATE_SHIPMENT">Create Shipments</option>
              <option value="SCHEDULE_PICKUP">Schedule Pickups</option>
              <option value="CANCEL_SHIPMENT">Cancel Shipments</option>
              <option value="DOWNLOAD_LABEL">Download Labels</option>
              <option value="EDIT_PICKUP_ADDRESS">Edit Pickup Address</option>
            </select>
            <select 
              className="border rounded p-2 text-sm"
              value={status || ''}
              onChange={(e) => handleFilter(type, e.target.value || undefined)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-500">
              <AlertCircle className="mr-2 h-5 w-5" />
              <span>Failed to load operations</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No bulk operations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    operationsData?.data?.map((operation: BulkOperation) => (
                      <TableRow key={operation.id}>
                        <TableCell>
                          <div className="font-medium">{getOperationTypeLabel(operation.type)}</div>
                          <div className="text-sm text-gray-500">Code: {operation.code}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(operation.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{
                                  width: `${
                                    operation.total_count > 0
                                      ? (operation.processed_count / operation.total_count) * 100
                                      : 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs">
                              {operation.processed_count}/{operation.total_count}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {operation.success_count} succeeded, {operation.failed_count} failed
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(operation.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(operation.id, 'report')}
                              disabled={operation.status !== 'COMPLETED' || downloading === `${operation.id}-report`}
                            >
                              {downloading === `${operation.id}-report` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4 mr-1" />
                              )}
                              Report
                            </Button>
                            {operation.type.toUpperCase() === 'DOWNLOAD_LABEL' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(operation.id, 'file')}
                                disabled={operation.status !== 'COMPLETED' || downloading === `${operation.id}-file`}
                              >
                                {downloading === `${operation.id}-file` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-1" />
                                )}
                                Labels
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {operationsData?.meta && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, operationsData.meta.total)} of{' '}
                    {operationsData.meta.total} operations
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= operationsData.meta.pageCount}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
