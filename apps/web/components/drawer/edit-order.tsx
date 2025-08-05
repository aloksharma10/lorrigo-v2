'use client';
import { Badge, Button, DrawerComponent } from '@lorrigo/ui/components';
import { X } from 'lucide-react';
import { OrderForm } from '../order/order-form';
import { DrawerSize, DrawerSide } from '@lorrigo/ui/components';
import { orderFormSchema } from '@lorrigo/utils/validations';
import { toast } from '@lorrigo/ui/components';
import { useOrderOperations } from '@/lib/apis/order';
import { OrderFormValues } from '@lorrigo/utils';

export default function EditOrder({
  order,
  onClose,
  isLoading = false,
  isOpen = false,
  drawerId,
  size = 'greater-mid',
  side = 'right',
}: {
  order?: any;
  onClose: () => void;
  isLoading?: boolean;
  isOpen?: boolean;
  drawerId?: string;
  size?: DrawerSize;
  side?: DrawerSide;
}) {
  const {
    updateOrder: { data: updatedOrder, isPending: isUpdatingOrder, mutateAsync: updateOrder, isSuccess: isOrderUpdated },
  } = useOrderOperations();

  async function onSubmit(values: OrderFormValues) {
    try {
      const validatedData = orderFormSchema.parse(values);
      await updateOrder({ ...validatedData, id: order?.id } as any);
      toast.success('Order updated successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order, Please Report to Support at support@lorrigo.in');
      console.error('Validation error:', error);
    }
  }

  return (
    <DrawerComponent open={isOpen} onOpenChange={onClose} size={size} side={side}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-4">
        <DrawerComponent.Title className="flex items-center gap-2 text-xl font-semibold">
          Edit Order{' '}
          <Badge className="block text-xs text-gray-500" variant="outline">
            {order?.orderNumber}
          </Badge>
        </DrawerComponent.Title>
        <DrawerComponent.Close asChild>
          <Button variant="outline" className="h-auto w-fit p-1" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </DrawerComponent.Close>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <OrderForm initialValues={order} onSubmit={onSubmit} isSubmitting={isUpdatingOrder} submitButtonText="Update Order" mode="edit" />
      </div>
    </DrawerComponent>
  );
}
