import { z } from 'zod';
import { ShipmentStatus } from '@lorrigo/db';

/**
 * Schema for creating a shipment
 */
export const CreateShipmentSchema = z.object({
  order_id: z.string().nonempty('Order ID is required'),
  courier_id: z.string().nonempty('Courier ID is required'),
  schedule_pickup: z.boolean().optional(),
});

/**
 * Schema for updating a shipment
 */
export const UpdateShipmentSchema = z.object({
  status: z.nativeEnum(ShipmentStatus).optional(),
  awb: z.string().optional(),
  shipping_charge: z.number().optional(),
  fw_charge: z.number().optional(),
  cod_amount: z.number().optional(),
  rto_charge: z.number().optional(),
  edd: z.date().optional(),
  pickup_date: z.date().optional()
});

/**
 * Schema for adding a tracking event
 */
export const AddTrackingEventSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  location: z.string().optional(),
  description: z.string().optional()
}); 