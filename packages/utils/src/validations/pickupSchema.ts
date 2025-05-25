import { z } from "zod";

export const pickupAddressSchema = z.object({
   facilityName: z
      .string()
      .min(1, "Facility name is required")
      .regex(/^[A-Za-z0-9_-]+$/, "Only A-Z, 0-9,- and _ are allowed"),
   contactPersonName: z.string().min(1, "Contact person name is required").refine((value) => typeof value === "string" && !/\d/.test(value), {
      message: "Contact person name cannot contain numbers",
   }),
   phone: z.string().min(10, "phone is required"),
   email: z.string().optional(),
   address: z.string().min(1, "Address is required").refine((value) => /[\/-]/.test(value), {
      message: "Address must contain / or -",
   }),
   country: z.string().min(1, "Country is required"),
   pincode: z.string().min(1, "Pincode is required"),
   city: z.string().min(1, "City is required"),
   state: z.string().min(1, "State is required"),
   isRTOAddressSame: z.boolean().optional(),
   rtoAddress: z.string().optional(),
   rtoCity: z.string().optional(),
   rtoState: z.string().optional(),
   rtoPincode: z.string().optional(),
}).refine((data) => {
   if (!data.isRTOAddressSame) {
      return (data?.rtoAddress?.length ?? 0) >= 5;
   }
   return true;
}, {
   message: "RTO Address must be at least 5 characters long",
   path: ["rtoAddress"]
}).refine((data) => {
   if (!data.isRTOAddressSame) {
      return (data?.rtoPincode?.length ?? 0) === 6;
   }
   return true;
}, {
   message: "RTO Pincode must be 6 characters long",
   path: ["rtoPincode"]
});