import * as z from 'zod';

export const zonePricingSchema = z.object({
  base_price: z.coerce.number().min(0, 'Base price must be positive'),
  increment_price: z.coerce.number().min(0, 'Increment price must be positive'),
  is_rto_same_as_fw: z.boolean().default(true),
  rto_base_price: z.coerce.number().min(0, 'RTO base price must be positive').default(0),
  rto_increment_price: z.coerce.number().min(0, 'RTO increment price must be positive').default(0),
  flat_rto_charge: z.coerce.number().min(0, 'Flat RTO charge must be positive').default(0),
});

export const courierPricingSchema = z.object({
  courierId: z.string().min(1, 'Please select a courier'),
  cod_charge_hard: z.coerce.number().min(0, 'COD charge must be positive'),
  cod_charge_percent: z.coerce.number().min(0).max(100, 'COD percentage must be between 0-100'),
  is_fw_applicable: z.boolean(),
  is_rto_applicable: z.boolean(),
  is_cod_applicable: z.boolean(),
  is_cod_reversal_applicable: z.boolean(),
  weight_slab: z.coerce.number().min(0.1, 'Weight slab must be at least 0.1kg'),
  increment_weight: z.coerce.number().min(0.1, 'Increment weight must be at least 0.1kg'),
  increment_price: z.coerce.number().min(0, 'Increment price must be positive'),
  zonePricing: z.object({
    Z_A: zonePricingSchema,
    Z_B: zonePricingSchema,
    Z_C: zonePricingSchema,
    Z_D: zonePricingSchema,
    Z_E: zonePricingSchema,
  }),
});

export const shippingPlanSchema = z
  .object({
    name: z.string().min(1, 'Plan name is required').max(100, 'Plan name too long'),
    description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
    isDefault: z.boolean(),
    features: z
      .array(z.string().min(1, 'Feature cannot be empty'))
      .min(1, 'At least one feature is required'),
    courierPricing: z.array(courierPricingSchema),
  })
  .refine(
    (data) => {
      // Custom validation to ensure at least one courier during submission
      return data.courierPricing.length > 0;
    },
    {
      message: 'At least one courier pricing is required',
      path: ['courierPricing'],
    }
  )
  .refine(
    (data) => {
      // Ensure all courier IDs are valid (not empty)
      return !data.courierPricing.some((courier) => !courier.courierId);
    },
    {
      message: 'All couriers must have a valid ID',
      path: ['courierPricing'],
    }
  );

export type ShippingPlanFormData = z.infer<typeof shippingPlanSchema>;
