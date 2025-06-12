"use client"
import { Button, DrawerComponent, Input, Label } from "@lorrigo/ui/components";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

export default function CloneOrder({
   order,
   onClose,
   isLoading = false,
   isOpen = false,
   drawerId,
}: {
   order?: any,
   onClose: () => void,
   isLoading?: boolean,
   isOpen?: boolean,
   drawerId?: string
}) {
   const [orderData, setOrderData] = useState<any>(order || {});

   useEffect(() => {
      if (order) {
         setOrderData(order);
      }
   }, [order]);

   const handleSubmit = () => {
      // Handle clone order submission logic here
      console.log("Cloning order:", orderData);
      onClose();
   };

   return (
      <DrawerComponent open={isOpen} onOpenChange={onClose}>
         <DrawerComponent.Title>Clone Order</DrawerComponent.Title>
         <DrawerComponent.Close asChild>
            <Button
               variant="outline"
               className="h-auto w-fit p-1"
               icon={<X className="size-5" />}
            >
               Close
            </Button>
         </DrawerComponent.Close>
         <DrawerComponent.Description>
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-2">
                  <Label>Order ID</Label>
                  <Input
                     value={orderData.orderNumber || ""}
                     onChange={(e) => setOrderData({ ...orderData, orderNumber: e.target.value })}
                  />
               </div>
               {orderData.customer && (
                  <div className="flex flex-col gap-2">
                     <Label>Customer Name</Label>
                     <Input
                        value={orderData.customer.name || ""}
                        onChange={(e) => setOrderData({
                           ...orderData,
                           customer: { ...orderData.customer, name: e.target.value }
                        })}
                     />
                  </div>
               )}
               <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="mt-4"
               >
                  {isLoading ? "Processing..." : "Clone Order"}
               </Button>
            </div>
         </DrawerComponent.Description>
      </DrawerComponent>
   )
}