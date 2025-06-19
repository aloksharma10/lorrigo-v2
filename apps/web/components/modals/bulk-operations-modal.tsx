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

// Define the operation types
type BulkOperationType = 'create-shipment' | 'schedule-pickup' | 'cancel-shipment';

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

export default function BulkOperationsModal({
  isOpen,
  onClose,
  selectedRows = [],
  operationType = 'create-shipment',
  onOperationComplete,
}: BulkOperationsModalProps) {
  const [activeTab, setActiveTab] = useState<BulkOperationType>(operationType);
  const [isLoading, setIsLoading] = useState(false);
  const [useFilters, setUseFilters] = useState(selectedRows.length === 0);
  const [selectedCouriers, setSelectedCouriers] = useState<CourierItem[]>([]);
  const [courierToAdd, setCourierToAdd] = useState<string>('');

  // const router = useRouter();
  const { bulkCreateShipments, bulkSchedulePickup, bulkCancelShipments, downloadBulkOperationFile } = useShippingOperations();

  const { getCouriersQuery } = useCourierOperations();
  const availableCouriers = getCouriersQuery.data || [];

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

      setActiveTab(operationType);
      setUseFilters(selectedRows.length === 0);
      setSelectedCouriers([]);
    }
  }, [isOpen, operationType, selectedRows.length]);

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

        result = await bulkCreateShipments.mutateAsync({
          order_ids,
          courier_ids,
          filters,
          is_schedule_pickup,
          pickup_date: pickup_date ? format(pickup_date, 'yyyy-MM-dd') : undefined,
        });
      } else if (activeTab === 'schedule-pickup') {
        const { pickup_date } = schedulePickupForm.getValues();

        // Prepare shipment_ids array if we have selected rows
        const shipment_ids =
          !useFilters && selectedRows.length > 0 ? selectedRows.map((row) => row.id) : undefined;

        result = await bulkSchedulePickup.mutateAsync({
          shipment_ids,
          pickup_date: format(pickup_date, 'yyyy-MM-dd'),
          filters,
        });
      } else if (activeTab === 'cancel-shipment') {
        const { reason } = cancelShipmentForm.getValues();

        // Prepare shipment_ids array if we have selected rows
        const shipment_ids =
          !useFilters && selectedRows.length > 0 ? selectedRows.map((row) => row.id) : undefined;

        result = await bulkCancelShipments.mutateAsync({
          shipment_ids,
          reason,
          filters,
        });
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
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{getOperationTitle(activeTab)}</DialogTitle>
          <DialogDescription>{getOperationDescription(activeTab)}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BulkOperationType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create-shipment">Create Shipments</TabsTrigger>
            <TabsTrigger value="schedule-pickup">Schedule Pickup</TabsTrigger>
            <TabsTrigger value="cancel-shipment">Cancel Shipments</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            {selectedRows.length > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 p-3">
                <span>
                  {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setUseFilters(!useFilters)}>
                  {useFilters ? 'Use Selected Items' : 'Use Filters Instead'}
                </Button>
              </div>
            )}

            {/* Filter Section (common for all tabs) */}
            {useFilters && (
              <div className="mb-6 rounded-md border p-4">
                <h3 className="mb-3 text-sm font-medium">Filter Items</h3>
                <Form {...filterForm}>
                  <form className="space-y-4">
                    <FormField
                      control={filterForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NEW">New</SelectItem>
                              <SelectItem value="COURIER_ASSIGNED">Courier Assigned</SelectItem>
                              <SelectItem value="PICKUP_SCHEDULED">Pickup Scheduled</SelectItem>
                              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={filterForm.control}
                        name="dateRange.0"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>From Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'PPP')
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={filterForm.control}
                        name="dateRange.1"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>To Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'PPP')
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* Operation-specific forms */}
            <TabsContent value="create-shipment">
              <Form {...createShipmentForm}>
                <form className="space-y-4">
                  {/* Courier Priority Selection */}
                  <div className="mb-6 rounded-md border p-4">
                    <h3 className="mb-3 text-sm font-medium">Courier Priority</h3>
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm">
                        Select and arrange couriers in order of priority. The system will try to use
                        the first courier, then fall back to others if needed.
                      </p>

                      {/* Courier selector */}
                      <div className="flex gap-2">
                        <Select value={courierToAdd} onValueChange={setCourierToAdd}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select courier" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCouriersQuery.isLoading ? (
                              <SelectItem value="loading" disabled>
                                Loading couriers...
                              </SelectItem>
                            ) : availableCouriers.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No couriers available
                              </SelectItem>
                            ) : (
                              availableCouriers
                                .filter((c: any) => !selectedCouriers.some((sc) => sc.id === c.id))
                                .map((courier: any) => (
                                  <SelectItem key={courier.id} value={courier.id}>
                                    {courier.name}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCourier}
                          disabled={!courierToAdd}
                        >
                          <Plus className="mr-1 h-4 w-4" /> Add
                        </Button>
                      </div>

                      {/* Courier priority list */}
                      <div className="mt-3">
                        {selectedCouriers.length === 0 ? (
                          <div className="rounded-md border bg-gray-50 py-6 text-center">
                            <p className="text-muted-foreground text-sm">No couriers selected</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              Add couriers to set priority order
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="mb-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {selectedCouriers.length} courier
                                {selectedCouriers.length !== 1 ? 's' : ''} selected
                              </Badge>
                              <p className="text-muted-foreground mt-1 text-xs">
                                Use arrows to reorder priority (top = highest priority)
                              </p>
                            </div>
                            <div className="max-h-60 space-y-2 overflow-y-auto">
                              {selectedCouriers.map((courier, index) => (
                                <div
                                  key={courier.id}
                                  className="flex items-center justify-between rounded border bg-white p-2"
                                >
                                  <span>{courier.name}</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveCourierUp(index)}
                                      disabled={index === 0}
                                      className="h-8 w-8 p-0"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveCourierDown(index)}
                                      disabled={index === selectedCouriers.length - 1}
                                      className="h-8 w-8 p-0"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCourier(courier.id)}
                                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={createShipmentForm.control}
                    name="is_schedule_pickup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Schedule pickup</FormLabel>
                          <FormDescription>
                            Automatically schedule pickup for created shipments
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="schedule-pickup">
              <Form {...schedulePickupForm}>
                <form className="space-y-4">
                  <FormField
                    control={schedulePickupForm.control}
                    name="pickup_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Pickup Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="cancel-shipment">
              <Form {...cancelShipmentForm}>
                <form className="space-y-4">
                  <FormField
                    control={cancelShipmentForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation Reason</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cancelled by seller">
                                Cancelled by seller
                              </SelectItem>
                              <SelectItem value="Out of stock">Out of stock</SelectItem>
                              <SelectItem value="Customer requested cancellation">
                                Customer requested cancellation
                              </SelectItem>
                              <SelectItem value="Delivery issue">Delivery issue</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>
          </div>
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
