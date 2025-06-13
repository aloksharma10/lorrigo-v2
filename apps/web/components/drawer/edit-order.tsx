"use client"
import { Button, DrawerComponent } from "@lorrigo/ui/components";
import { X } from "lucide-react";
import { useState } from "react";
import { OrderForm } from "../order/order-form";
import { DrawerSize, DrawerSide } from "@lorrigo/ui/components";
import { z } from "zod";
import { orderFormSchema } from "@lorrigo/utils/validations";
import { toast } from "@lorrigo/ui/components";

export default function EditOrder({
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
   const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async (values: z.infer<typeof orderFormSchema>) => {
      try {
         setSubmitting(true);
         // Here you would call your API to update the order
         console.log("Updating order with values:", values);
         
         // Simulate API call
         await new Promise((resolve) => setTimeout(resolve, 1000));
         
         toast.success('Order updated successfully');
         onClose();
      } catch (error: any) {
         toast.error(error.message || 'Failed to update order');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <DrawerComponent open={isOpen} onOpenChange={onClose} size={size} side={side}>
         <div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-4 ">
            <DrawerComponent.Title className="text-xl font-semibold">Edit Order</DrawerComponent.Title>
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
         <div className="flex-1 overflow-auto p-4">
            <OrderForm 
               initialValues={order} 
               onSubmit={handleSubmit} 
               isSubmitting={submitting}
               submitButtonText="Update Order"
               mode="edit"
            />
         </div>
      </DrawerComponent>
   )
} 