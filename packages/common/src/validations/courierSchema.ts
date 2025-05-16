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
  minWeight: z.number().positive(),
  maxWeight: z.number().positive().optional(),
  price: z.number().positive(),
});

// Schema for additional charges
export const AdditionalChargeSchema = z.object({
  name: z.string(),
  amount: z.number().positive(),
  isPercentage: z.boolean().default(false),
});

// Schema for courier pricing
export const CourierPricingSchema = z.object({
  courierId: z.string(),
  basePrice: z.number().positive(),
  pricePerKg: z.number().positive(),
  rules: z.array(PricingRuleSchema).optional(),
  additionalCharges: z.array(AdditionalChargeSchema).optional(),
});

// Schema for shipping cost calculation request
export const ShippingCostRequestSchema = z.object({
  courierId: z.string(),
  weight: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
}); 