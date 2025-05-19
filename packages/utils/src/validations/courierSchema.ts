import { z } from 'zod';

/**
 * Common validation schemas for couriers
 */

// Schema for courier API configuration
export const CourierApiConfigSchema = z.object({
  apiKey: z.string().optional(),
  apiUrl: z.string().url().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  accountNumber: z.string().optional(),
});

// Schema for creating a new courier
export const CreateCourierSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
  supportedCountries: z.array(z.string()).optional(),
  apiConfig: CourierApiConfigSchema.optional(),
});

// Schema for updating a courier (all fields optional)
export const UpdateCourierSchema = CreateCourierSchema.partial();

// Schema for pricing rules
export const PricingRuleSchema = z.object({
  min_weight: z.number().positive(),
  max_weight: z.number().positive().optional(),
  price: z.number().positive(),
});

// Schema for additional charges
export const AdditionalChargeSchema = z.object({
  name: z.string(),
  amount: z.number().positive(),
  is_percentage: z.boolean().default(false),
});

// Schema for courier pricing
export const CourierPricingSchema = z.object({
  courier_id: z.string(),
  base_price: z.number().positive(),
  price_per_kg: z.number().positive(),
  rules: z.array(PricingRuleSchema).optional(),
  additional_charges: z.array(AdditionalChargeSchema).optional(),
});

// Schema for shipping cost calculation request
export const ShippingCostRequestSchema = z.object({
  courierId: z.string(),
  weight: z.number().positive(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});
