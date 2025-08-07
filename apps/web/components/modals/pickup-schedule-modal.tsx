'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format, startOfDay } from 'date-fns';

import {
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
} from '@lorrigo/ui/components';

import { useModalStore } from '@/modal/modal-store';
import { X, CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useShippingOperations } from '@/lib/apis/shipment';

const pickupDateSchema = z.object({
  pickupDate: z.date({
    required_error: 'Please select a pickup date',
  }),
});

type PickupFormValues = z.infer<typeof pickupDateSchema>;

export const PickupScheduleModal = () => {
  const router = useRouter();
  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'pickup-schedule')[0];
  const modal_id = modal_props!.id;
  const { shipmentId, orderNumber, awb } = modal_props?.props as {
    shipmentId: string;
    orderNumber: string;
    awb: string;
  };

  // Use the schedulePickup mutation from the hook
  const { schedulePickup } = useShippingOperations();
  const { isPending: isSubmitting } = schedulePickup;

  const form = useForm<PickupFormValues>({
    resolver: zodResolver(pickupDateSchema),
    defaultValues: {
      pickupDate: undefined,
    },
  });

  const handleClose = () => {
    form.reset();
    closeModal(modal_id);
  };

  const onSubmit = async (values: PickupFormValues) => {
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = format(values.pickupDate, 'yyyy-MM-dd');
      await schedulePickup.mutateAsync({
        shipmentId,
        pickupDate: formattedDate,
      });
      handleClose();
      router.refresh();
    } catch (error) {
      console.error('Error scheduling pickup:', error);
    }
  };

  // Calculate min and max dates for the calendar
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const maxDate = addDays(today, 7);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold">
          Schedule Your Pick Up
          <Badge className="ml-2 text-xs" variant="outline">
            {orderNumber}
          </Badge>
        </h2>
        <button onClick={handleClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <div className="px-6">
        {awb && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 p-4 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <p>
              Your package has been assigned to <strong>AWB {awb}</strong>
            </p>
          </div>
        )}

        <p className="mb-4 text-sm text-gray-600">Please select a suitable date for your order to be picked up</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
          <FormField
            control={form.control}
            name="pickupDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Pickup Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={`w-full pl-3 text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                        disabled={isSubmitting}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Please select a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < tomorrow || date > maxDate || date.getDay() === 0}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-4">
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
              <p>In case you schedule the pick up for today, you will not be able to reschedule this pick up.</p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between py-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              I'll do it later
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Pick Up'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};
