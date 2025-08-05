/**
 * Lorrigo Shipment Bucketing System
 *
 * This module provides a robust, flexible system for mapping between
 * shipment statuses and bucket IDs. It supports bidirectional mapping,
 * keyword-based status detection, and caching for performance.
 */

// Define bucket IDs as an enum for type safety
export enum ShipmentBucket {
  ALL = 101,
  NEW = 0,
  READY_TO_SHIP = 1,
  IN_TRANSIT = 2,
  NDR = 3,
  DELIVERED = 4,
  RTO_INITIATED = 5,
  RTO_IN_TRANSIT = 51,
  RTO_DELIVERED = 9,
  CANCELLED_ORDER = 6,
  LOST_DAMAGED = 7,
  DISPOSED = 8,
  COURIER_ASSIGNED = 11,
  PICKUP_SCHEDULED = 12,
  PICKED_UP = 13,
  OUT_FOR_DELIVERY = 41,
  EXCEPTION = 81,
  CANCELLED_SHIPMENT = 61,
  AWAITING = 100,
}

// Centralized bucket-to-status mapping
export const bucketToStatusMap: Record<number, string> = {
  [ShipmentBucket.ALL]: 'ALL',
  [ShipmentBucket.NEW]: 'NEW',
  [ShipmentBucket.READY_TO_SHIP]: 'READY_TO_SHIP',
  [ShipmentBucket.COURIER_ASSIGNED]: 'COURIER_ASSIGNED',
  [ShipmentBucket.PICKUP_SCHEDULED]: 'PICKUP_SCHEDULED',
  [ShipmentBucket.PICKED_UP]: 'PICKED_UP',
  [ShipmentBucket.IN_TRANSIT]: 'IN_TRANSIT',
  [ShipmentBucket.OUT_FOR_DELIVERY]: 'OUT_FOR_DELIVERY',
  [ShipmentBucket.DELIVERED]: 'DELIVERED',
  [ShipmentBucket.NDR]: 'NDR',
  [ShipmentBucket.RTO_INITIATED]: 'RTO_INITIATED',
  [ShipmentBucket.RTO_IN_TRANSIT]: 'RTO_IN_TRANSIT',
  [ShipmentBucket.RTO_DELIVERED]: 'RTO_DELIVERED',
  [ShipmentBucket.CANCELLED_ORDER]: 'CANCELLED_ORDER',
  [ShipmentBucket.LOST_DAMAGED]: 'LOST_DAMAGED',
  [ShipmentBucket.DISPOSED]: 'DISPOSED',
  [ShipmentBucket.EXCEPTION]: 'EXCEPTION',
  [ShipmentBucket.CANCELLED_SHIPMENT]: 'CANCELLED_SHIPMENT',
  [ShipmentBucket.AWAITING]: 'AWAITING',
};

// Generate status-to-bucket mapping from bucket-to-status mapping
export const statusToBucketMap: Record<string, number> = Object.entries(bucketToStatusMap).reduce(
  (acc, [bucket, status]) => {
    acc[status] = parseInt(bucket, 10);
    return acc;
  },
  {} as Record<string, number>
);

// Add special mappings for getStatusBuckets function
const statusToMultipleBucketsMap: Record<string, number[]> = {
  'READY-TO-SHIP': [ShipmentBucket.READY_TO_SHIP, ShipmentBucket.COURIER_ASSIGNED, ShipmentBucket.PICKUP_SCHEDULED, ShipmentBucket.PICKED_UP],
  READY_TO_SHIP: [ShipmentBucket.READY_TO_SHIP, ShipmentBucket.COURIER_ASSIGNED, ShipmentBucket.PICKUP_SCHEDULED, ShipmentBucket.PICKED_UP],
  TRANSIT: [ShipmentBucket.IN_TRANSIT, ShipmentBucket.OUT_FOR_DELIVERY],
  IN_TRANSIT: [ShipmentBucket.IN_TRANSIT, ShipmentBucket.OUT_FOR_DELIVERY, ShipmentBucket.NDR],
  RTO: [ShipmentBucket.RTO_INITIATED, ShipmentBucket.RTO_IN_TRANSIT, ShipmentBucket.RTO_DELIVERED],
  CANCELLED: [ShipmentBucket.CANCELLED_ORDER, ShipmentBucket.CANCELLED_SHIPMENT],
  ALL: [], // Special case - no bucket filter
};

export const getStatusBuckets = (status: string): number[] => {
  const normalizedStatus = status.toUpperCase();

  // Check for multiple bucket mappings first
  if (statusToMultipleBucketsMap[normalizedStatus]) {
    return statusToMultipleBucketsMap[normalizedStatus];
  }

  // Check for single bucket mapping
  if (statusToBucketMap[normalizedStatus]) {
    return [statusToBucketMap[normalizedStatus]];
  }

  return [];
};

/**
 * Maps bucket number to readable status string
 */
export const getBucketStatus = (bucket: number | null | undefined): string => {
  if (bucket === null || bucket === undefined) return 'AWAITING';
  return bucketToStatusMap[bucket] || 'AWAITING';
};

/**
 * Get bucket from status string
 */
export const getShipmentBucket = (status: string): number => {
  const normalizedStatus = status.toUpperCase();

  // Handle special cases
  if (normalizedStatus === 'CANCELLED') {
    return ShipmentBucket.CANCELLED_ORDER;
  }

  return statusToBucketMap[normalizedStatus] ?? ShipmentBucket.NEW;
};

// Define keyword patterns for status detection
export const statusKeywordPatterns: Record<number, RegExp[]> = {
  [ShipmentBucket.ALL]: [/all/i],
  [ShipmentBucket.NEW]: [/new/i, /created/i, /placed/i, /manifested/i],
  [ShipmentBucket.COURIER_ASSIGNED]: [/assigned/i, /pending/i, /ready/i],
  [ShipmentBucket.PICKUP_SCHEDULED]: [/pickup[_ ]scheduled/i, /scheduled[_ ]pickup/i, /out[_ ]for[_ ]pickup/i],
  [ShipmentBucket.PICKED_UP]: [/picked[_ ]up/i, /pickup[_ ]complete/i],
  [ShipmentBucket.IN_TRANSIT]: [/transit/i, /shipped/i, /dispatched/i, /intransit/i],
  [ShipmentBucket.OUT_FOR_DELIVERY]: [/out[_ ]for[_ ]delivery/i],
  [ShipmentBucket.DELIVERED]: [/delivered/i],
  [ShipmentBucket.NDR]: [/undelivered/i, /ndr/i, /not[_ ]delivered/i, /delivery[_ ]failed/i],
  [ShipmentBucket.RTO_INITIATED]: [/rto[^_]/i, /return[_ ]to[_ ]origin/i, /returned/i, /^rt$/i],
  [ShipmentBucket.RTO_IN_TRANSIT]: [/rto[_ ]in[_ ]transit/i, /return[_ ]in[_ ]transit/i],
  [ShipmentBucket.RTO_DELIVERED]: [/rto[_ ]delivered/i, /return[_ ]delivered/i],
  [ShipmentBucket.EXCEPTION]: [/exception/i, /lost/i, /damaged/i, /failed/i],
  [ShipmentBucket.CANCELLED_SHIPMENT]: [/cancel/i],
  [ShipmentBucket.CANCELLED_ORDER]: [/cancel[_ ]order/i],
};

// Cache for vendor status mappings
const vendorStatusCache: Record<string, number> = {};

// Vendor-specific status mappings for high-performance lookups
const vendorSpecificMappings: Record<string, Record<string, number>> = {
  SHIPROCKET: {
    ALL: ShipmentBucket.ALL,
    NEW: ShipmentBucket.NEW,
    PICKUP_GENERATED: ShipmentBucket.COURIER_ASSIGNED,
    PICKUP: ShipmentBucket.PICKUP_SCHEDULED,
    PICKED: ShipmentBucket.PICKED_UP,
    SHIPPED: ShipmentBucket.IN_TRANSIT,
    IN_TRANSIT: ShipmentBucket.IN_TRANSIT,
    OUT_FOR_DELIVERY: ShipmentBucket.OUT_FOR_DELIVERY,
    DELIVERED: ShipmentBucket.DELIVERED,
    UNDELIVERED: ShipmentBucket.NDR,
    NDR: ShipmentBucket.NDR,
    RTO_INITIATED: ShipmentBucket.RTO_INITIATED,
    RTO_IN_TRANSIT: ShipmentBucket.RTO_IN_TRANSIT,
    RTO_DELIVERED: ShipmentBucket.RTO_DELIVERED,
    PICKUP_EXCEPTION: ShipmentBucket.EXCEPTION,
    LOST: ShipmentBucket.EXCEPTION,
    DAMAGED: ShipmentBucket.EXCEPTION,
    CANCELLED: ShipmentBucket.CANCELLED_SHIPMENT,
  },
  DELHIVERY: {
    ALL: ShipmentBucket.ALL,
    Manifested: ShipmentBucket.NEW,
    Assigned: ShipmentBucket.COURIER_ASSIGNED,
    PENDING: ShipmentBucket.COURIER_ASSIGNED,
    Pickup: ShipmentBucket.PICKUP_SCHEDULED,
    Picked: ShipmentBucket.PICKED_UP,
    'In Transit': ShipmentBucket.IN_TRANSIT,
    Dispatched: ShipmentBucket.IN_TRANSIT,
    'Out for Delivery': ShipmentBucket.OUT_FOR_DELIVERY,
    Delivered: ShipmentBucket.DELIVERED,
    Undelivered: ShipmentBucket.NDR,
    NDR: ShipmentBucket.NDR,
    RTO_INITIATED: ShipmentBucket.RTO_INITIATED,
    RTO_IN_TRANSIT: ShipmentBucket.RTO_IN_TRANSIT,
    'RTO Delivered': ShipmentBucket.RTO_DELIVERED,
    Lost: ShipmentBucket.EXCEPTION,
    Damaged: ShipmentBucket.EXCEPTION,
    Exception: ShipmentBucket.EXCEPTION,
    Cancelled: ShipmentBucket.CANCELLED_SHIPMENT,
  },
  SMARTSHIP: {
    ALL: ShipmentBucket.ALL,
    NEW: ShipmentBucket.NEW,
    ASSIGNED: ShipmentBucket.COURIER_ASSIGNED,
    PENDING: ShipmentBucket.COURIER_ASSIGNED,
    PICKUP: ShipmentBucket.PICKUP_SCHEDULED,
    PICKED: ShipmentBucket.PICKED_UP,
    PICKUP_COMPLETE: ShipmentBucket.PICKED_UP,
    IN_TRANSIT: ShipmentBucket.IN_TRANSIT,
    INTRANSIT: ShipmentBucket.IN_TRANSIT,
    OUT_FOR_DELIVERY: ShipmentBucket.OUT_FOR_DELIVERY,
    DELIVERED: ShipmentBucket.DELIVERED,
    UNDELIVERED: ShipmentBucket.NDR,
    NDR: ShipmentBucket.NDR,
    RTO_INITIATED: ShipmentBucket.RTO_INITIATED,
    RTO_IN_TRANSIT: ShipmentBucket.RTO_IN_TRANSIT,
    RTO_DELIVERED: ShipmentBucket.RTO_DELIVERED,
    EXCEPTION: ShipmentBucket.EXCEPTION,
    LOST: ShipmentBucket.EXCEPTION,
    DAMAGED: ShipmentBucket.EXCEPTION,
    CANCELLED: ShipmentBucket.CANCELLED_SHIPMENT,
  },
  SHIPROCKET_B2B: {
    ALL: ShipmentBucket.ALL,
    NEW: ShipmentBucket.NEW,
    PENDING: ShipmentBucket.COURIER_ASSIGNED,
    PICKUP_SCHEDULED: ShipmentBucket.PICKUP_SCHEDULED,
    IN_TRANSIT: ShipmentBucket.IN_TRANSIT,
    OUT_FOR_DELIVERY: ShipmentBucket.OUT_FOR_DELIVERY,
    DELIVERED: ShipmentBucket.DELIVERED,
    UNDELIVERED: ShipmentBucket.NDR,
    RTO_INITIATED: ShipmentBucket.RTO_INITIATED,
    RTO_IN_TRANSIT: ShipmentBucket.RTO_IN_TRANSIT,
    RTO_DELIVERED: ShipmentBucket.RTO_DELIVERED,
    CANCELLED: ShipmentBucket.CANCELLED_SHIPMENT,
  },
};

// External status mappings that can be loaded from Redis or DB
let externalStatusMappings: Record<string, Record<string, number>> = {};

/**
 * ShipmentBucketManager - Main class for handling shipment bucket operations
 */
export class ShipmentBucketManager {
  /**
   * Get bucket ID from shipment status
   */
  static getBucketFromStatus(status: string): number {
    if (!status) return ShipmentBucket.NEW;

    const normalizedStatus = status.toUpperCase().trim();
    return statusToBucketMap[normalizedStatus] || ShipmentBucket.NEW;
  }

  /**
   * Get status string from bucket ID
   */
  static getStatusFromBucket(bucket: number): string {
    return bucketToStatusMap[bucket] || 'AWAITING';
  }

  /**
   * Get status string from bucket ID (alias for getStatusFromBucket)
   */
  static getBucketStatus(bucket: number): string {
    return this.getStatusFromBucket(bucket);
  }

  /**
   * Load external status mappings from a JSON object
   */
  static loadExternalMappings(mappings: Record<string, Record<string, number>>): void {
    externalStatusMappings = { ...mappings };
    this.clearCache();
  }

  /**
   * Get bucket from vendor-specific status code with high performance
   */
  static getBucketFromVendorStatus(statusCode: string, vendorName: string): number | undefined {
    if (!statusCode || !vendorName) return undefined;

    const normalizedVendor = vendorName.toUpperCase().trim();
    const normalizedStatus = statusCode.toUpperCase().trim();

    // Try cache first
    const cacheKey = `${normalizedVendor}:${normalizedStatus}`;
    if (vendorStatusCache[cacheKey] !== undefined) {
      return vendorStatusCache[cacheKey];
    }

    // Try vendor-specific mappings
    let bucket: number | undefined;

    // Check built-in mappings
    if (vendorSpecificMappings[normalizedVendor]?.[normalizedStatus] !== undefined) {
      bucket = vendorSpecificMappings[normalizedVendor][normalizedStatus];
    }
    // Check external mappings if not found
    else if (externalStatusMappings[normalizedVendor]?.[normalizedStatus] !== undefined) {
      bucket = externalStatusMappings[normalizedVendor][normalizedStatus];
    }

    // Cache the result if found
    if (bucket !== undefined) {
      vendorStatusCache[cacheKey] = bucket;
      return bucket;
    }

    return undefined;
  }

  /**
   * Detect bucket from vendor status using keyword matching
   */
  static detectBucketFromVendorStatus(status: string, statusCode?: string, vendorName?: string): number {
    if (!status && !statusCode) return ShipmentBucket.NEW;

    // Try direct vendor mapping first if vendor and status code are provided
    if (vendorName && statusCode) {
      const directBucket = this.getBucketFromVendorStatus(statusCode, vendorName);
      if (directBucket !== undefined) {
        return directBucket;
      }
    }

    // Try cache for the full status
    const cacheKey = vendorName ? `${vendorName}:${statusCode || status}` : '';
    if (cacheKey && vendorStatusCache[cacheKey]) {
      return vendorStatusCache[cacheKey];
    }

    // Combine status and code for better matching
    const combinedText = `${status} ${statusCode || ''}`.toLowerCase();

    // Special case for RTO_DELIVERED
    if (/rto[_ ]delivered|return[_ ]delivered/.test(combinedText)) {
      if (cacheKey) {
        vendorStatusCache[cacheKey] = ShipmentBucket.RTO_DELIVERED;
      }
      return ShipmentBucket.RTO_DELIVERED;
    }

    // Try to match against keyword patterns
    for (const [bucketId, patterns] of Object.entries(statusKeywordPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(combinedText)) {
          const bucket = parseInt(bucketId, 10);

          // Cache the result if vendor name is provided
          if (cacheKey) {
            vendorStatusCache[cacheKey] = bucket;
          }

          return bucket;
        }
      }
    }

    // Default to ALL if no match found
    return ShipmentBucket.ALL;
  }

  /**
   * Check if a status indicates an RTO (Return to Origin) condition
   */
  static isRTOStatus(status: string, statusCode?: string): boolean {
    if (!status && !statusCode) return false;

    const combinedText = `${status} ${statusCode || ''}`.toLowerCase();
    return /rto|return[_ ]to[_ ]origin|^rt$/.test(combinedText);
  }

  /**
   * Check if a status indicates an NDR (Not Delivered) condition
   */
  static isNDRStatus(status: string, statusCode?: string): boolean {
    if (!status && !statusCode) return false;

    const combinedText = `${status} ${statusCode || ''}`.toLowerCase();
    return /undelivered|ndr|not[_ ]delivered|delivery[_ ]failed/.test(combinedText);
  }

  /**
   * Check if a status indicates delivery completion
   */
  static isDeliveredStatus(status: string, statusCode?: string): boolean {
    if (!status && !statusCode) return false;

    const combinedText = `${status} ${statusCode || ''}`.toLowerCase();
    return /delivered/.test(combinedText);
  }

  /**
   * Check if a status is a final status that doesn't need tracking
   */
  static isFinalStatus(status: string): boolean {
    if (!status) return false;

    const normalizedStatus = status.toUpperCase().trim();
    return ['DELIVERED', 'RTO_DELIVERED'].includes(normalizedStatus);
  }

  /**
   * Clear the vendor status cache
   */
  static clearCache(): void {
    Object.keys(vendorStatusCache).forEach((key) => {
      delete vendorStatusCache[key];
    });
  }
}

// For backward compatibility
export const bucketMap: Record<number, string> = bucketToStatusMap;
export const bucketMapLabel: Record<string, number> = statusToBucketMap;
