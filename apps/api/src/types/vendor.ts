export interface VendorRegistrationResult {
   success: boolean;
   message: string;
   data: any;
}

export interface VendorShipmentResult {
   success: boolean;
   message: string;
   awb?: string;
   routingCode?: string;
   data: any;
}

export type VendorRegistrationData = {
   name: string;
   address: string;
   city: string;
   state: string;
   country: string;
   pincode: string;
   phone: string;
   email: string;
};