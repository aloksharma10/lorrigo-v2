import { z } from 'zod';

// Zone pricing schema
const ZonePricingSchema = z.object({
  basePrice: z.number().min(0),
  incrementPrice: z.number().min(0),
  isRTOSameAsFW: z.boolean().default(true),
  rtoBasePrice: z.number().min(0).optional(),
  rtoIncrementPrice: z.number().min(0).optional()
});

// Courier pricing schema
const CourierPricingSchema = z.object({
  courierId: z.string().uuid(),
  basePrice: z.number().min(0),
  weightSlab: z.number().min(0),
  incrementWeight: z.number().min(0.1),
  incrementPrice: z.number().min(0),
  zonePricing: z.object({
    withinCity: ZonePricingSchema,
    withinZone: ZonePricingSchema,
    withinMetro: ZonePricingSchema,
    withinRoi: ZonePricingSchema,
    northEast: ZonePricingSchema
  })
});

// Create plan schema
export const CreatePlanSchema = {
  body: z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500),
    isDefault: z.boolean().default(false),
    features: z.array(z.string()).default([]),
    courierPricing: z.array(CourierPricingSchema)
  })
};

// Update plan schema
export const UpdatePlanSchema = {
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    isDefault: z.boolean().optional(),
    features: z.array(z.string()).optional(),
    courierPricing: z.array(CourierPricingSchema).optional()
  })
};

// Calculate rates schema
export const CalculateRatesSchema = {
  body: z.object({
    pickupPincode: z.string().length(6).regex(/^\d+$/),
    deliveryPincode: z.string().length(6).regex(/^\d+$/),
    weight: z.number().positive(),
    weightUnit: z.enum(['kg', 'g']),
    boxLength: z.number().positive(),
    boxWidth: z.number().positive(),
    boxHeight: z.number().positive(),
    sizeUnit: z.enum(['cm', 'in']),
    paymentType: z.number().min(0).max(1),
    collectableAmount: z.number().min(0).optional(),
    isReversedOrder: z.boolean().default(false)
  })
}; 