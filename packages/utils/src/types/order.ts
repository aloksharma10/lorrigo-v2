export interface BackendOrder {
   id: string;
   orderNumber: string;
   status: string;
   totalAmount: number;
   customerId: string;
   paymentType: string;
   amountToCollect: number;
   awb: string;
   channel: string;
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
   sellerDetails?: {
     id: string;
     name: string;
     address: string;
     city: string;
     state: string;
     pincode: string;
     gstNo: string;
     contactNumber: string;
     country: string;
     isAddressAvailable: boolean;
   };
   productDetails: {
     products: Array<{
       id: string;
       name: string;
       sku: string;
       quantity: number;
       price: number;
       taxRate: number;
       hsnCode: string;
     }>;
     taxableValue: number;
   };
   packageDetails: {
     length: number;
     breadth: number;
     height: number;
     deadWeight: number;
     volumetricWeight: number;
   };
   hub?: {
     id: string;
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
   orderInvoiceNumber: string;
   orderInvoiceDate: string;
   ewaybill: string;
 }
 