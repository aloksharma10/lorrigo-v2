export interface BackendOrder {
   id: string;
   orderNumber: string;
   status: string;
   totalAmount: number;
   customerId: string;
   customerName: string;
   paymentType: string;
   amountToCollect: number;
   awb: string;
   trackingEvents: Array<{
     description: string;
     code: string;
     status: string;
     timestamp: string;
   }>;
   pickupDate: string;
   edd: string;
   pickupId: string;
   customer?: {
     id: string;
     name: string;
     email: string;
     phone: string;
   };
   packageDetails: {
     length: number;
     breadth: number;
     height: number;
     deadWeight: number;
     volumetricWeight: number;
   };
   hub?: {
     name: string;
     lorrigoPickupId: string;
     address: string;
   };
   shippingAddress?: {
     id: string;
     street: string;
     city: string;
     state: string;
     postalCode: string;
     country: string;
   };
   shipments?: Array<{
     id: string;
     trackingNumber: string;
     status: string;
   }>;
   notes?: string;
   createdAt: string;
   updatedAt: string;
 }
 