import { z } from 'zod';

/**
 * Common validation schemas for orders
 */

// Order status enum used across the application
export const OrderStatusEnum = z.enum([
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
]);

// Schema for order items
export const OrderItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

// Schema for creating a new order
export const CreateOrderSchema = z.object({
  customer_id: z.string(),
  shipping_address_id: z.string(),
  return_address_id: z.string().optional(),
  total_amount: z.number().positive(),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema),
});

// Schema for updating an order
export const UpdateOrderSchema = z.object({
  status: OrderStatusEnum.optional(),
  notes: z.string().optional(),
});

// Schema for order query parameters
export const OrderQuerySchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  status: OrderStatusEnum.optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

// Schema for order statistics query parameters
export const OrderStatsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
});
