import { z } from 'zod';

/**
 * Common validation schemas for shipments
 */

// Shipment status enum used across the application
export const ShipmentStatusEnum = z.enum([
  'CREATED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'UNDELIVERED',
  'RETURNED',
  'EXCEPTION',
]);

// Schema for shipment dimensions
export const DimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
});

// Schema for creating a new shipment
export const CreateShipmentSchema = z.object({
  orderId: z.string(),
  weight: z.number().positive(),
  dimensions: DimensionsSchema.optional(),
  hubId: z.string(),
  courierId: z.string(),
});

// Schema for updating a shipment
export const UpdateShipmentSchema = z.object({
  status: ShipmentStatusEnum.optional(),
  tracking_url: z.string().url().optional(),
});

// Schema for adding a tracking event
export const AddTrackingEventSchema = z.object({
  location: z.string(),
  description: z.string(),
  status: ShipmentStatusEnum,
});
