'use client';

import { useEffect, useState, useRef } from 'react';
import { Button, toast } from '@lorrigo/ui/components';

import { type OrderFormValues, orderFormSchema } from '@lorrigo/utils/validations';
import { BackButton } from '@/components/back-btn';
import { useOrderOperations } from '@/lib/apis/order';
import { useRouter } from 'next/navigation';
import { OrderForm, OrderFormRef } from '@/components/order/order-form';

export default function OrderFormPage() {
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const formRef = useRef<OrderFormRef>(null);

  const router = useRouter();
  const {
    createOrder: {
      data: order,
      isPending: isCreatingOrder,
      mutateAsync: createOrder,
      isSuccess: isOrderCreated,
    },
  } = useOrderOperations();

  async function onSubmit(values: OrderFormValues) {
    try {
      const validatedData = orderFormSchema.parse(values);
      await createOrder(validatedData);
      toast.success('Order created successfully');
    } catch (error: any) {
      toast.error(
        error.response.data.message ||
          'Failed to create order, Please Report to Support at support@lorrigo.in'
      );
      console.error('Validation error:', error);
    }
  }

  const OrderSubmitBtn = () => {
    const handleCreateOrder = () => {
      setRedirectPath('/seller/orders/forward-shipments/new');
      formRef.current?.submitForm();
    };

    const handleShipNow = () => {
      setRedirectPath(`/seller/orders/${(order as any)?.id}`);
      formRef.current?.submitForm();
    };

    return (
      <div className="flex gap-4">
        <Button isLoading={isCreatingOrder} onClick={handleCreateOrder} variant="secondary">
          Create Order
        </Button>
        <Button isLoading={isCreatingOrder} onClick={handleShipNow}>
          Ship Now
        </Button>
      </div>
    );
  };

  useEffect(() => {
    if (isOrderCreated && (order as any)?.id && redirectPath) {
      router.push(redirectPath);
    }
  }, [isOrderCreated, order, redirectPath, router]);

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 rounded-t-md border-b bg-white shadow-sm dark:bg-stone-900">
        <div className="container flex max-w-full items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <BackButton showLabel={false} />
            <h1 className="text-sm font-semibold lg:text-xl">Add Order</h1>
          </div>
          <OrderSubmitBtn />
        </div>
      </div>

      <div className="container max-w-full pt-4">
        <OrderForm ref={formRef} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
