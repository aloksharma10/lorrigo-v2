/**
 * Export all validation schemas from a single entry point
 */

export const phoneRegex = /^[0-9]{10}$/;

export * from './form-schemas';
export * from './orderSchema';
export * from './courierSchema';
export * from './pickupSchema';
export * from './shipmentSchema';