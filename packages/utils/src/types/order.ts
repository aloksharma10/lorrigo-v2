export interface BackendOrder {
   id: string;
   orderNumber: string;
   status: string;
   totalAmount: number;
   customerId: string;
   paymentType: string;
   amountToCollect: number;
   awb: string;
   courier: string;
   courierNickname: string;
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
     name: string;
     email: string;
     phone: string;
     address: string;
     city: string;
     state: string;
     pincode: string;
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
     city: string;
     state: string;
     pincode: string;
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
 