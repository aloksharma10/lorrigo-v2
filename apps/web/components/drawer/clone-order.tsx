"use client"
import { Button, DrawerComponent } from "@lorrigo/ui/components";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { OrderForm } from "../order/order-form";
import { DrawerSize, DrawerSide } from "@lorrigo/ui/components";
import { z } from "zod";
import { orderFormSchema, OrderFormValues } from "@lorrigo/utils/validations";
import { toast } from "@lorrigo/ui/components";
import { useOrderOperations } from "@/lib/apis/order";

export default function CloneOrder({
   order,
   onClose,
   isLoading = false,
   isOpen = false,
   drawerId,
   size = "greater-mid",
   side = "right",
}: {
   order?: any,
   onClose: () => void,
   isLoading?: boolean,
   isOpen?: boolean,
   drawerId?: string,
   size?: DrawerSize,
   side?: DrawerSide
}) {
   const {
      createOrder: {
        data: clonedOrder,
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

   return (
      <DrawerComponent open={isOpen} onOpenChange={onClose} size={size} side={side}>
         <div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-4">
            <DrawerComponent.Title className="text-xl font-semibold">Clone Order</DrawerComponent.Title>
            <DrawerComponent.Close asChild>
               <Button
                  variant="outline"
                  className="h-auto w-fit p-1"
                  size="icon"
               >
                  <X className="h-5 w-5" />
               </Button>
            </DrawerComponent.Close>
         </div>
         <div className="flex-1 overflow-auto p-4 lg:py-0 lg:pt-4 ">
            <OrderForm 
               initialValues={order} 
               onSubmit={onSubmit} 
               isSubmitting={isCreatingOrder}
               submitButtonText="Clone Order"
               mode="clone"
            />
         </div>
      </DrawerComponent>
   )
}