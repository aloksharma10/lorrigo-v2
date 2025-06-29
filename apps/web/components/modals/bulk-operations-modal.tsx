'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@lorrigo/ui/components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@lorrigo/ui/components';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lorrigo/ui/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Calendar } from '@lorrigo/ui/components';
import { Popover, PopoverContent, PopoverTrigger } from '@lorrigo/ui/components';
import { CalendarIcon, Loader2, ChevronUp, ChevronDown, X, Plus, Download } from 'lucide-react';
import { cn } from '@lorrigo/ui/lib/utils';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@lorrigo/ui/components';
import { useShippingOperations, BulkOperationResponse } from '@/lib/apis/shipment';
import { useCourierOperations } from '@/lib/apis/couriers';
import { Badge } from '@lorrigo/ui/components';
import { CSVField, CSVUploadModal, CSVUploadResult, HeaderMapping } from './csv-upload-modal';
import { useMutation } from '@tanstack/react-query';
import { useBulkOperationsModal } from '@/lib/hooks/use-bulk-operations-modal';

// Define the operation types
type BulkOperationType = 'create-shipment' | 'schedule-pickup' | 'cancel-shipment' | 'upload';

// Props interface
interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRows?: any[];
  operationType?: BulkOperationType;
  onOperationComplete?: (result: BulkOperationResponse) => void;
}

interface CourierItem {
  id: string;
  name: string;
}

// Form schemas
const createShipmentSchema = z.object({
  is_schedule_pickup: z.boolean().optional(),
  pickup_date: z.date().optional(),
});

const schedulePickupSchema = z.object({
  pickup_date: z.date(),
});

const cancelShipmentSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

// Filter schema (common for all operations)
const filterSchema = z.object({
  status: z.string().optional(),
  dateRange: z.tuple([z.date().optional(), z.date().optional()]).optional(),
});

export default function BulkOperationsModal() {
  const { isOpen, selectedRows, onOperationComplete, closeModal: onClose } = useBulkOperationsModal();
  const [activeTab, setActiveTab] = useState<BulkOperationType>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [useFilters, setUseFilters] = useState(false);
  const [selectedCouriers, setSelectedCouriers] = useState<CourierItem[]>([]);
  const [courierToAdd, setCourierToAdd] = useState<string>('');

  // const router = useRouter();
  const { createBulkShipments, scheduleBulkPickups, cancelBulkShipments, downloadBulkOperationFile } = useShippingOperations();

  const { getCouriersQuery } = useCourierOperations();
  const availableCouriers = getCouriersQuery.data?.couriers || [];

  // Forms for each operation type
  const createShipmentForm = useForm<z.infer<typeof createShipmentSchema>>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      is_schedule_pickup: true,
      pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    },
  });

  const schedulePickupForm = useForm<z.infer<typeof schedulePickupSchema>>({
    resolver: zodResolver(schedulePickupSchema),
    defaultValues: {
      pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    },
  });

  const cancelShipmentForm = useForm<z.infer<typeof cancelShipmentSchema>>({
    resolver: zodResolver(cancelShipmentSchema),
    defaultValues: {
      reason: 'Cancelled by seller',
    },
  });

  // Filter form (common for all operations)
  const filterForm = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      status: undefined,
      dateRange: [undefined, undefined],
    },
  });

  // Reset forms when modal opens
  useEffect(() => {
    if (isOpen) {
      createShipmentForm.reset({
        is_schedule_pickup: true,
        pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      schedulePickupForm.reset({
        pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      cancelShipmentForm.reset({
        reason: 'Cancelled by seller',
      });

      filterForm.reset({
        status: undefined,
        dateRange: [undefined, undefined],
      });

      setActiveTab('upload');
      setUseFilters(false);
      setSelectedCouriers([]);
    }
  }, [isOpen]);

  // Add courier to priority list
  const addCourier = () => {
    if (!courierToAdd) return;

    const courier = availableCouriers.find((c: any) => c.id === courierToAdd);
    if (courier && !selectedCouriers.some((c) => c.id === courier.id)) {
      setSelectedCouriers([...selectedCouriers, { id: courier.id, name: courier.name }]);
      setCourierToAdd('');
    }
  };

  // Remove courier from priority list
  const removeCourier = (id: string) => {
    setSelectedCouriers(selectedCouriers.filter((c) => c.id !== id));
  };

  // Move courier up in priority
  const moveCourierUp = (index: number) => {
    if (index <= 0) return;
    const newCouriers = [...selectedCouriers] as any[];
    const temp = newCouriers[index];
    newCouriers[index] = newCouriers[index - 1];
    newCouriers[index - 1] = temp;
    setSelectedCouriers(newCouriers);
  };

  // Move courier down in priority
  const moveCourierDown = (index: number) => {
    if (index >= selectedCouriers.length - 1) return;
    const newCouriers = [...selectedCouriers] as any[];
    const temp = newCouriers[index];
    newCouriers[index] = newCouriers[index + 1];
    newCouriers[index + 1] = temp;
    setSelectedCouriers(newCouriers);
  };

  // Define fields for order import
  const orderFields: CSVField[] = [
    { key: 'order_id', label: 'Order ID', required: true, description: 'Unique identifier for the order' },
    { key: 'customer_name', label: 'Customer Name', required: true },
    { key: 'customer_email', label: 'Customer Email', required: true },
    { key: 'customer_phone', label: 'Customer Phone', required: false },
    { key: 'shipping_address', label: 'Shipping Address', required: true },
    { key: 'shipping_city', label: 'City', required: true },
    { key: 'shipping_state', label: 'State', required: true },
    { key: 'shipping_zip', label: 'ZIP/Postal Code', required: true },
    { key: 'product_sku', label: 'Product SKU', required: true },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'price', label: 'Price', required: true },
  ];

  // Use React Query for the upload process
  const uploadMutation = useMutation({
    mutationFn: async ({ file, mapping }: { file: File; mapping: HeaderMapping }) => {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo, return a successful result
      return { success: true, processedRows: Math.floor(Math.random() * 100) + 50 };
    }
  });

  const handleOrderUpload = async (file: File, mapping: HeaderMapping): Promise<CSVUploadResult> => {
    try {
      const result = await uploadMutation.mutateAsync({ file, mapping });
      
      // Call the onOperationComplete callback if provided
      if (onOperationComplete) {
        onOperationComplete({
          success: result.success,
          operation: {
            id: '1',
            code: 'upload',
            type: 'CREATE_SHIPMENT',
            status: 'PENDING',
            total_count: 1,
            processed_count: 1,
            success_count: 0,
            failed_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            progress: 100,
            results: [],
          },
        });
      }
      
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      };
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      let result: any;

      // Prepare filters if using them
      const filters = useFilters
        ? {
          status: filterForm.getValues('status'),
          dateRange: filterForm.getValues('dateRange')
            ? ([
              filterForm.getValues('dateRange')?.[0]?.toISOString() || undefined,
              filterForm.getValues('dateRange')?.[1]?.toISOString() || undefined,
            ] as [string | undefined, string | undefined])
            : undefined,
        }
        : undefined;

      // Handle different operation types
      if (activeTab === 'create-shipment') {
        const { is_schedule_pickup, pickup_date } = createShipmentForm.getValues();

        // Prepare order_ids array if we have selected rows
        const order_ids =
          !useFilters && selectedRows.length > 0 ? selectedRows.map((row) => row.id) : undefined;

        // Use the prioritized courier_ids from the list
        const courier_ids =
          selectedCouriers.length > 0 ? selectedCouriers.map((courier) => courier.id) : undefined;

        result = await createBulkShipments.mutateAsync({
          order_ids,
          courier_ids,
          filters: filters,
          is_schedule_pickup,
          pickup_date: pickup_date ? format(pickup_date, 'yyyy-MM-dd') : undefined,
        });
      } else if (activeTab === 'schedule-pickup') {
        const { pickup_date } = schedulePickupForm.getValues();

        // Prepare shipment_ids array if we have selected rows
        const shipment_ids =
          !useFilters && selectedRows.length > 0 ? selectedRows.map((row) => row.id) : undefined;

        result = await scheduleBulkPickups.mutateAsync({
          shipment_ids,
          pickup_date: format(pickup_date, 'yyyy-MM-dd'),
          filters: filters,
        });
      } else if (activeTab === 'cancel-shipment') {
        const { reason } = cancelShipmentForm.getValues();

        // Prepare shipment_ids array if we have selected rows
        const shipment_ids =
          !useFilters && selectedRows.length > 0 ? selectedRows.map((row) => row.id) : undefined;

        result = await cancelBulkShipments.mutateAsync({
          shipment_ids,
          reason,
          filters,
        });
      } else if (activeTab === 'upload') {
        // Handle CSV upload
        const file = new File([], 'orders.csv'); // Replace with actual file handling
        const mapping: HeaderMapping = {
          // Populate mapping based on CSV headers
        };
        result = await handleOrderUpload(file, mapping);
      }

      // Handle successful operation
      if (result && result.success) {
        onOperationComplete?.(result);

        // Navigate to bulk operations log page
        toast.success(`${getOperationTitle(activeTab)} operation started successfully`);
        // router.push('/seller/bulk-log');
        // onClose();
      }
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file download
  const handleDownload = async (operationId: string, type: 'report' | 'file') => {
    try {
      const response = await downloadBulkOperationFile(operationId, type);

      // Create a blob from the response data
      const blob = new Blob([response.data], {
        type: type === 'report' ? 'text/csv' : 'application/pdf'
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk_operation_${type === 'report' ? 'report.csv' : 'file.pdf'}`;
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success(`${type === 'report' ? 'Report' : 'File'} downloaded successfully`);
    } catch (error: any) {
      toast.error(`Failed to download ${type}: ${error.message || 'Unknown error'}`);
    }
  };

  // Helper function to get operation title
  const getOperationTitle = (type: BulkOperationType) => {
    switch (type) {
      case 'create-shipment':
        return 'Bulk Shipment Creation';
      case 'schedule-pickup':
        return 'Bulk Pickup Scheduling';
      case 'cancel-shipment':
        return 'Bulk Shipment Cancellation';
      case 'upload':
        return 'CSV Upload';
      default:
        return 'Bulk Operation';
    }
  };

  // Helper function to get operation description
  const getOperationDescription = (type: BulkOperationType) => {
    switch (type) {
      case 'create-shipment':
        return 'Create multiple shipments at once';
      case 'schedule-pickup':
        return 'Schedule pickup for multiple shipments';
      case 'cancel-shipment':
        return 'Cancel multiple shipments';
      case 'upload':
        return 'Upload multiple orders at once';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{getOperationTitle(activeTab)}</DialogTitle>
          <DialogDescription>{getOperationDescription(activeTab)}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BulkOperationType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">CSV Upload</TabsTrigger>
            <TabsTrigger value="actions">Bulk Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file to create multiple orders at once.
              </p>
              
              <CSVUploadModal
                fields={orderFields}
                onSubmit={handleOrderUpload}
                title="Import Orders"
                description="Upload order data from your existing system."
                buttonLabel="Select CSV File"
                acceptedFileTypes={['.csv']}
                maxFileSize={5}
                enableMappingPreferences={true}
                preferenceKey="orderMappingPreferences"
                className="w-full"
                showMinimize={true}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="actions" className="mt-4 space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Perform bulk actions on selected orders or shipments.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full">Cancel Orders</Button>
                <Button variant="outline" className="w-full">Update Status</Button>
                <Button variant="outline" className="w-full">Generate Labels</Button>
                <Button variant="outline" className="w-full">Export Data</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Processing...' : 'Start Operation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
