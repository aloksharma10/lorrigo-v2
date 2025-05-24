import { z } from 'zod';
import { phoneRegex } from '@lorrigo/utils/validations';

// Pickup Address Schema
export const pickupAddressSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  verified: z.boolean(),
});

// Seller Details Schema
export const sellerDetailsSchema = z.object({
  sellerName: z.string().min(1, 'Seller name is required'),
  gstNo: z.string().optional(),
  address: z.string().optional(),
  contactNumber: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
  pincode: z.string().min(6, 'Invalid pincode').max(6, 'Invalid pincode').optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string(),
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
  alternateMobile: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
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
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  taxRate: z.number().min(0, 'Tax rate must be greater than or equal to 0'),
  hsnCode: z.string(),
});

export const productDetailsSchema = z.object({
  products: z.array(productSchema).min(1, 'At least one product is required'),
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
  sellerDetails: sellerDetailsSchema,
  deliveryDetails: deliveryDetailsSchema,
  productDetails: productDetailsSchema,
  paymentMethod: paymentMethodSchema,
  packageDetails: packageDetailsSchema,
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