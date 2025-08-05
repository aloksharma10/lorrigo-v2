'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@lorrigo/ui/components';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lorrigo/ui/components';
import { Popover, PopoverContent, PopoverTrigger } from '@lorrigo/ui/components';
import { Calendar } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { Textarea } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Separator } from '@lorrigo/ui/components';
import { toast } from '@lorrigo/ui/components';
import { useNDROperations, type NDROrder } from '@/lib/apis/ndr';
import { useModalStore } from '@/modal/modal-store';

// Helper function for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Schema for NDR action form
const ndrActionSchema = z.object({
  actionType: z.enum(['reattempt', 'return', 'cancel', 'fake-attempt'], {
    required_error: 'Please select an action type',
  }),
  comment: z.string().min(5, 'Comment must be at least 5 characters').max(500, 'Comment must be less than 500 characters'),
  nextAttemptDate: z.date().optional(),
});

type NDRActionFormValues = z.infer<typeof ndrActionSchema>;

interface NDRActionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: NDROrder[];
  isBulkAction?: boolean;
}

const actionTypeConfig = {
  reattempt: {
    label: 'Re-attempt Delivery',
    description: 'Schedule another delivery attempt',
    color: 'blue',
    requiresDate: true,
  },
  return: {
    label: 'Return to Origin (RTO)',
    description: 'Return the shipment to the seller',
    color: 'orange',
    requiresDate: false,
  },
  cancel: {
    label: 'Cancel Order',
    description: 'Cancel the order completely',
    color: 'red',
    requiresDate: false,
  },
  'fake-attempt': {
    label: 'Fake Attempt',
    description: 'Mark as fake delivery attempt',
    color: 'yellow',
    requiresDate: false,
  },
} as const;

export function NDRActionModal() {
  const { modals, closeModal } = useModalStore();

  const modal_props = modals.filter((modal) => modal.type === 'ndr-action')[0];
  const modal_id = modal_props!.id;
  const { selectedOrders, isBulkAction } = modal_props?.props as {
    selectedOrders: NDROrder[];
    isBulkAction: boolean;
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { takeNDRAction, takeBulkNDRAction } = useNDROperations();

  const form = useForm<NDRActionFormValues>({
    resolver: zodResolver(ndrActionSchema),
    defaultValues: {
      actionType: undefined,
      comment: '',
      nextAttemptDate: undefined,
    },
  });

  const selectedActionType = form.watch('actionType');
  const requiresDate = selectedActionType ? actionTypeConfig[selectedActionType]?.requiresDate || false : false;

  const onSubmit = async (values: NDRActionFormValues) => {
    if (selectedOrders.length === 0) {
      toast.error('No orders selected');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isBulkAction || selectedOrders.length > 1) {
        // Bulk action
        const ndrIds = selectedOrders.map((order) => order.id);

        const result = await takeBulkNDRAction.mutateAsync({
          ndrIds,
          actionType: values.actionType,
          comment: values.comment,
          nextAttemptDate: values.nextAttemptDate?.toISOString(),
        });

        if (result.success) {
          toast.success(`Bulk NDR action queued for ${selectedOrders.length} orders. Operation ID: ${result.operationId}`);
          closeModal(modal_id);
        } else {
          toast.error(result.message || 'Failed to queue bulk action');
        }
      } else {
        // Single action
        if (!selectedOrders[0]) {
          toast.error('No order selected');
          return;
        }

        const result = await takeNDRAction.mutateAsync({
          ndrId: selectedOrders[0].id,
          actionType: values.actionType,
          comment: values.comment,
          nextAttemptDate: values.nextAttemptDate?.toISOString(),
        });

        if (result && typeof result === 'object' && 'success' in result) {
          if (result.success) {
            toast.success('NDR action completed successfully');
            closeModal(modal_id);
          } else {
            toast.error((result as any).message || 'Failed to take NDR action');
          }
        } else {
          toast.error('Unexpected response format');
        }
      }
    } catch (error: any) {
      console.error('Error taking NDR action:', error);
      toast.error(error?.response?.data?.message || 'An error occurred while processing the NDR action');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{isBulkAction || selectedOrders.length > 1 ? 'Bulk NDR Action' : 'NDR Action'}</h2>
            <p className="text-muted-foreground text-sm">
              {isBulkAction || selectedOrders.length > 1
                ? `Take action on ${selectedOrders.length} selected NDR orders`
                : 'Take action on the selected NDR order'}
            </p>
          </div>
          <button onClick={() => closeModal(modal_id)} className="rounded-full p-1 hover:bg-neutral-100">
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Selected Orders Summary */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 text-sm font-medium">Selected Orders</h4>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {selectedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order.awb}</span>
                    <Badge variant="outline" className="text-xs">
                      {order.attempts} attempt{order.attempts !== 1 ? 's' : ''}
                    </Badge>
                    {order.otp_verified && (
                      <Badge variant="secondary" className="border-blue-200 bg-blue-50 text-xs text-blue-600">
                        OTP Verified
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground">{order.shipment?.order?.customer?.name || order.order?.customer?.name || order.customer?.name}</div>
                </div>
              ))}
            </div>

            {/* OTP Verification Warning */}
            {selectedOrders.some((order) => order.otp_verified) && (
              <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">OTP Verified Orders Detected</p>
                    <p className="mt-1 text-yellow-700">Some selected orders are OTP verified. Re-attempt actions may not be successful for these orders.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* NDR Action Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Action Type Selection */}
              <FormField
                control={form.control}
                name="actionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue className="w-full text-sm" placeholder="Select an action type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(actionTypeConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  config.color === 'blue' && 'bg-blue-500',
                                  config.color === 'orange' && 'bg-orange-500',
                                  config.color === 'red' && 'bg-red-500',
                                  config.color === 'yellow' && 'bg-yellow-500'
                                )}
                              />
                              <div>
                                <div className="font-medium">
                                  {config.label} - <span className="text-muted-foreground text-xs">{config.description}</span>
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Next Attempt Date (only for reattempt) */}
              {requiresDate && (
                <FormField
                  control={form.control}
                  name="nextAttemptDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Next Attempt Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() || date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Select the date for the next delivery attempt</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Comment */}
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter details about the NDR action..." className="resize-none" rows={4} {...field} />
                    </FormControl>
                    <FormDescription>Provide additional details or instructions for this action</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => closeModal(modal_id)} disabled={isSubmitting} isLoading={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                  {isBulkAction || selectedOrders.length > 1 ? `Process ${selectedOrders.length} Orders` : 'Process Order'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
