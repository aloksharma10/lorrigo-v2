import { z } from 'zod';

/**
 * Common validation schemas for orders
 */

// Order status enum used across the application
export const OrderStatusEnum = z.enum([
  'NEW',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
]);

// Schema for order query parameters
export const OrderQuerySchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  status: OrderStatusEnum.optional(),
  search: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  sort: z.string().optional(),
  sort_order: z.string().optional().default('desc'),
});

// Schema for order statistics query parameters
export const OrderStatsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
});
