import { ShipmentStatus } from '@lorrigo/db';
import { z } from 'zod';

export const CreateShipmentSchema = z.object({
  orderId: z.string(),
  courierId: z.string(),
});

export const UpdateShipmentSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
});

export const AddTrackingEventSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  location: z.string(),
  description: z.string(),
});
