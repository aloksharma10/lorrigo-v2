import { z } from 'zod';

// Phone regex pattern
export const phoneRegex = /^[0-9]{10}$/;

// DeliveryDetailsForm Schema
export const deliveryFormSchema = z.object({
  isBusiness: z.boolean().default(false),
  mobileNumber: z
    .string()
    .regex(phoneRegex, { message: 'Please enter a valid 10-digit mobile number' }),
  fullName: z.string().min(1, { message: 'Full name is required' }),
  completeAddress: z.string().min(1, { message: 'Address is required' }),
  landmark: z.string().optional(),
  pincode: z.string().min(1, { message: 'Pincode is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  alternateMobile: z
    .string()
    .regex(phoneRegex, { message: 'Please enter a valid 10-digit mobile number' })
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address' })
    .optional()
    .or(z.literal('')),
  billingIsSameAsDelivery: z.boolean().default(true),
  billingMobileNumber: z
    .string()
    .regex(phoneRegex, { message: 'Please enter a valid 10-digit mobile number' })
    .optional()
    .or(z.literal('')),
  billingFullName: z.string().optional().or(z.literal('')),
  billingCompleteAddress: z.string().optional().or(z.literal('')),
  billingLandmark: z.string().optional().or(z.literal('')),
  billingPincode: z.string().optional().or(z.literal('')),
  billingCity: z.string().optional().or(z.literal('')),
  billingState: z.string().optional().or(z.literal('')),
});

// PackageDetailsForm Schema
export const packageFormSchema = z.object({
  deadWeight: z.string().min(1, { message: 'Dead weight is required' }),
  length: z.string().min(1, { message: 'Length is required' }),
  breadth: z.string().min(1, { message: 'Breadth is required' }),
  height: z.string().min(1, { message: 'Height is required' }),
  volumetricWeight: z.string(),
});

// PaymentMethodSelector Schema
export const paymentFormSchema = z.object({
  paymentMethod: z.enum(['cod', 'prepaid'], {
    required_error: 'Please select a payment method',
  }),
});

// PickupAddressSelector Schema
export const addressFormSchema = z.object({
  address: z.string().min(1, { message: 'Please select or enter an address' }),
});

// ProductDetailsForm Schema
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Product name is required' }),
  price: z.number().min(0, { message: 'Price must be a positive number' }),
  quantity: z.number().min(1, { message: 'Quantity must be at least 1' }),
  discount: z.number().min(0, { message: 'Discount must be a positive number' }).optional(),
  taxRate: z.number().min(0, { message: 'Tax rate must be a positive number' }).optional(),
  hsnCode: z.string().optional(),
});

export const productFormSchema = z.object({
  products: z.array(productSchema).min(1, { message: 'At least one product is required' }),
});

// SellerDetailsForm Schema
export const sellerFormSchema = z.object({
  sellerName: z.string().min(1, { message: 'Seller name is required' }),
  gstNo: z.string().optional(),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
});

// OrderForm Schema
export const orderFormSchema = z.object({
  // Add other schema fields as needed for the order form
  orderType: z.enum(['domestic', 'international']).default('domestic'),
  orderMode: z.enum(['single', 'bulk']).default('single'),
});
