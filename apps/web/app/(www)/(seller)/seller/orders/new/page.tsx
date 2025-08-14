'use client';

import { useRef } from 'react';
import { StickyBar, toast } from '@lorrigo/ui/components';

import { type OrderFormValues, orderFormSchema } from '@lorrigo/utils/validations';
import { BackButton } from '@/components/back-btn';
import { useOrderOperations } from '@/lib/apis/order';
import { useRouter } from 'next/navigation';
import { OrderForm, OrderFormRef } from '@/components/order/order-form';

export default function OrderFormPage() {
  const formRef = useRef<OrderFormRef>(null);

  const router = useRouter();
  const {
    createOrder: { data: order, isPending: isCreatingOrder, mutateAsync: createOrder, isSuccess: isOrderCreated },
  } = useOrderOperations();

  async function onSubmit(values: OrderFormValues) {
    try {
      // Validate the data with the schema first
      const validatedData = orderFormSchema.parse(values);

      // Use type assertion to bypass strict TypeScript checking in production
      // while ensuring the data structure is correct
      await createOrder(validatedData as any);
      router.push(`/seller/orders/forward-shipments/new`);
      toast.success('Order created successfully');
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create order, Please Report to Support at support@lorrigo.in');
    }
  }
  return (
    <div className="w-full">
      <StickyBar
        position="top"
        initialBgClass="bg-white/95 dark:bg-stone-900/95"
        scrolledBgClass="bg-white dark:bg-stone-900"
        className="top-14 rounded-t-md shadow-sm"
        zIndex={10}
      >
        <div className="flex max-w-full items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <BackButton showLabel={false} />
            <h1 className="text-sm font-semibold lg:text-xl">Add Order</h1>
          </div>
        </div>
      </StickyBar>

      <div className="max-w-full pt-4">
        <OrderForm ref={formRef} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
