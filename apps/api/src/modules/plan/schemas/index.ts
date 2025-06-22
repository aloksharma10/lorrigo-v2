import { z } from 'zod';

// Define a schema for zone pricing that matches the MongoDB schema
export const ZonePricingItemSchema = z.object({
  base_price: z.number().min(0),
  increment_price: z.number().min(0),
  isRTOSameAsFW: z.boolean().optional().default(true),
  rto_base_price: z.number().min(0).optional().default(0),
  rto_increment_price: z.number().min(0).optional().default(0),
  flat_rto_charge: z.number().min(0).optional().default(0),
});

export const ZonePricingSchema = z.object({
  Z_A: ZonePricingItemSchema,
  Z_B: ZonePricingItemSchema,
  Z_C: ZonePricingItemSchema,
  Z_D: ZonePricingItemSchema,
  Z_E: ZonePricingItemSchema,
});

export const CourierPricingSchema = z.object({
  courierId: z.string().min(1),
  basePrice: z.number().min(0),
  weightSlab: z.number().min(0),
  incrementWeight: z.number().min(0),
  incrementPrice: z.number().min(0),
  zonePricing: ZonePricingSchema,
});

export const CreatePlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  features: z.array(z.string()).default([]),
  courierPricing: z.array(CourierPricingSchema),
});

export const UpdatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  courierPricing: z.array(CourierPricingSchema).optional(),
});

export const CalculateRatesSchema = z.object({
  pickupPincode: z.string().min(6).max(6),
  deliveryPincode: z.string().min(6).max(6),
  weight: z.number().min(0),
  weightUnit: z.enum(['kg', 'g']),
  boxLength: z.number().min(0),
  boxWidth: z.number().min(0),
  boxHeight: z.number().min(0),
  sizeUnit: z.enum(['cm', 'in']),
  paymentType: z.number().min(0).max(1), // 0 for prepaid, 1 for COD
  collectableAmount: z.number().min(0).optional(),
  isReversedOrder: z.boolean().optional().default(false),
});
