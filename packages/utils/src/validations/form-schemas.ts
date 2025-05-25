import { z } from 'zod';
import { phoneRegex } from '.';

// Pickup Address Schema
export const pickupAddressSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  verified: z.boolean(),
});

// Seller Details Schema
export const sellerDetailsSchema = z
  .object({
    sellerName: z.string().min(1, 'Seller name is required'),
    gstNo: z.string().optional(),
    isAddressAvailable: z.boolean(),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
    pincode: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().min(1, 'Country is required'),
  })
  .superRefine((data, ctx) => {
    if (data.isAddressAvailable) {
      // Address must be present and not empty
      if (!data.address || data.address.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Address is required',
          path: ['address'],
        });
      }

      // Pincode must be exactly 6 digits
      if (!data.pincode || !/^\d{6}$/.test(data.pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid pincode',
          path: ['pincode'],
        });
      }

      // City required
      if (!data.city || data.city.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'City is required',
          path: ['city'],
        });
      }

      // State required
      if (!data.state || data.state.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'State is required',
          path: ['state'],
        });
      }

      // Contact number validation using regex
      if (!data.contactNumber || !phoneRegex.test(data.contactNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid phone number',
          path: ['contactNumber'],
        });
      }
    }
  });

// Delivery Details Schema
export const deliveryDetailsSchema = z.object({
  isBusiness: z.boolean(),
  mobileNumber: z.string().regex(phoneRegex, 'Invalid phone number'),
  fullName: z.string().min(1, 'Full name is required'),
  completeAddress: z.string().min(1, 'Address is required'),
  landmark: z.string(),
  pincode: z.string().min(6, 'Invalid pincode').max(6, 'Invalid pincode'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  email: z.string().email('Invalid email').optional(),
  billingIsSameAsDelivery: z.boolean(),
  billingMobileNumber: z.string().regex(phoneRegex, 'Invalid phone number'),
  billingFullName: z.string().min(1, 'Full name is required'),
  billingCompleteAddress: z.string().min(1, 'Address is required'),
  billingLandmark: z.string(),
  billingPincode: z.string().min(6, 'Invalid pincode').max(6, 'Invalid pincode'),
  billingCity: z.string().min(1, 'City is required'),
  billingState: z.string().min(1, 'State is required'),
});

// Product Schema
export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  sku: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  taxRate: z.number().min(0, 'Tax rate must be greater than or equal to 0'),
  hsnCode: z.string(),
});

export const productDetailsSchema = z.object({
  products: z.array(productSchema).min(1, 'At least one product is required'),
  taxableValue: z.number().min(0, 'Taxable value must be greater than or equal to 0').optional(),
});

// Payment Method Schema
export const paymentMethodSchema = z.object({
  paymentMethod: z.enum(['cod', 'prepaid']),
});

// Package Details Schema
export const packageDetailsSchema = z.object({
  deadWeight: z.string().min(1, 'Dead weight is required'),
  length: z.string().min(1, 'Length is required'),
  breadth: z.string().min(1, 'Breadth is required'),
  height: z.string().min(1, 'Height is required'),
  volumetricWeight: z.string(),
});

// Complete Order Schema
export const orderFormSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  orderChannel: z.string().min(1, 'Order Channel is required'),
  orderType: z.enum(['domestic', 'international']),
  orderMode: z.enum(['single', 'bulk']),
  pickupAddressId: z.string().min(1, 'Pickup address is required'),
  status: z.string().optional(),
  sellerDetails: sellerDetailsSchema,
  deliveryDetails: deliveryDetailsSchema,
  productDetails: productDetailsSchema,
  paymentMethod: paymentMethodSchema,
  packageDetails: packageDetailsSchema,
  amountToCollect: z.coerce.number().optional(),
  ewaybill: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod.paymentMethod === 'cod') {
    const totalAmount = data.productDetails?.products?.reduce((acc, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemUnits = Number(item.quantity) || 0;
      return acc + (itemPrice * itemUnits);
    }, 0) || 0;
    return Number(data.amountToCollect ?? 0) > 0 && Number(data.amountToCollect ?? 0) <= Number(data.productDetails ? data.productDetails.taxableValue : totalAmount);
  }
  return true;
}, {
  message: "Amount to Collect must be greater than 0 and less than or equal to taxable value",
  path: ["amountToCollect"],
}).refine((data) => {
  if (data.productDetails && data.productDetails.taxableValue && data.productDetails.taxableValue >= 50000) {
    return (data.ewaybill ?? "").length === 12;
  }
  return true;
}, {
  message: "Ewaybill is required and must be 12 digits for order value >= 50,000",
  path: ["ewaybill"],
});

// Update Order Schema
export const updateOrderFormSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required').optional(),
  orderChannel: z.string().min(1, 'Order Channel is required').optional(),
  orderType: z.enum(['domestic', 'international']).optional(),
  orderMode: z.enum(['single', 'bulk']).optional(),
  pickupAddressId: z.string().min(1, 'Pickup address is required').optional(),
  status: z.string().optional(),
  sellerDetails: sellerDetailsSchema.optional(),
  deliveryDetails: deliveryDetailsSchema.partial().optional(),
  productDetails: productDetailsSchema.partial().optional(),
  packageDetails: packageDetailsSchema.partial().optional(),
  amountToCollect: z.coerce.number().optional(),
  ewaybill: z.string().optional(),
}).refine((data) => {
  if (data.productDetails && data.productDetails.taxableValue && data.productDetails.taxableValue >= 50000) {
    return (data.ewaybill ?? "").length === 12;
  }
  return true;
}, {
  message: "Ewaybill is required and must be 12 digits for order value >= 50,000",
  path: ["ewaybill"],
});

// Types
export type PickupAddress = z.infer<typeof pickupAddressSchema>;
export type SellerFormValues = z.infer<typeof sellerDetailsSchema>;
export type DeliveryFormValues = z.infer<typeof deliveryDetailsSchema>;
export type ProductItem = z.infer<typeof productSchema>;
export type ProductFormValues = z.infer<typeof productDetailsSchema>;
export type PaymentFormValues = z.infer<typeof paymentMethodSchema>;
export type PackageFormValues = z.infer<typeof packageDetailsSchema>;
export type OrderFormValues = z.infer<typeof orderFormSchema>;
export type UpdateOrderFormValues = z.infer<typeof updateOrderFormSchema>;