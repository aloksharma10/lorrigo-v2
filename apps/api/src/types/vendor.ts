export type VendorRegistrationResult = {
   success: boolean;
   message: string;
   data: any;
};

export type VendorRegistrationData = {
   name: string;
   address: string;
   city: string;
   state: string;
   country: string;
   pincode: string;
   phone: string;
   email: string;
   password: string;
};