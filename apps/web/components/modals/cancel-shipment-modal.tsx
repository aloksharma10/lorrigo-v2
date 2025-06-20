'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@lorrigo/ui/components';

import { useModalStore } from '@/modal/modal-store';
import { X, AlertTriangle } from 'lucide-react';
import { useShippingOperations } from '@/lib/apis/shipment';

const cancelReasonSchema = z.object({
  reason: z.string().min(1, { message: 'Please select a reason for cancellation' }),
});

type CancelFormValues = z.infer<typeof cancelReasonSchema>;

export const CancelShipmentModal = () => {
  const router = useRouter();
  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'cancel-shipment')[0];
  const modal_id = modal_props!.id;
  const { shipmentId, orderNumber } = modal_props?.props as {
    shipmentId: string;
    orderNumber: string;
  };

  const { cancelShipment } = useShippingOperations();
  const { isPending: isSubmitting } = cancelShipment;

  const form = useForm<CancelFormValues>({
    resolver: zodResolver(cancelReasonSchema),
    defaultValues: {
      reason: '',
    },
  });

  const handleClose = () => {
    form.reset();
    closeModal(modal_id);
  };

  const onSubmit = async (values: CancelFormValues, cancelType: 'order' | 'shipment') => {
    try {
      await cancelShipment.mutateAsync({
        shipmentId,
        reason: values.reason,
        cancelType,
      });

      handleClose();
      router.refresh();
    } catch (error: any) {
      console.error('Error cancelling:', error);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold">
          Cancel Order or Shipment
          <Badge className="block text-xs text-gray-500" variant="outline">
            {orderNumber}
          </Badge>
        </h2>
        <button onClick={handleClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <div className="px-6">
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <p>Do you want to cancel the Order or Shipment?</p>
        </div>
        <p className="mt-2 text-sm text-gray-500">You can't undo this action.</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onSubmit(values, 'shipment'))}
          className="space-y-4 px-6 py-4"
        >
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select reason to cancel</FormLabel>
                <FormControl>
                  <Select
                    disabled={isSubmitting}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_request">
                        Customer requested cancellation
                      </SelectItem>
                      <SelectItem value="out_of_stock">Item out of stock</SelectItem>
                      <SelectItem value="address_issue">Address issue</SelectItem>
                      <SelectItem value="courier_issue">Courier service issue</SelectItem>
                      <SelectItem value="payment_issue">Payment issue</SelectItem>
                      <SelectItem value="other">Other reason</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-4">
            <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
              <p className="mb-2">
                <strong>
                  Once the Shipment is cancelled, you can still reassign the Order to a different
                  courier.
                </strong>
              </p>
              <p className="mb-2">
                However, a cancelled Order will not be available in the panel for reassignment.
                Please choose to cancel the Order only if there is no need to ship it anymore.
              </p>
              <p>
                In both cases, a cancellation request would be sent to the courier partner. Once
                confirmed by the partner, the freight charges will be refunded and credited to your
                Lorrigo wallet immediately.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 grid grid-cols-2 gap-2 py-4">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => form.handleSubmit((values) => onSubmit(values, 'order'))()}
              disabled={isSubmitting}
            >
              Cancel Order
            </Button>
            <Button
              type="button"
              variant="default"
              className="w-full"
              onClick={() => form.handleSubmit((values) => onSubmit(values, 'shipment'))()}
              disabled={isSubmitting}
            >
              Cancel Shipment
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};
