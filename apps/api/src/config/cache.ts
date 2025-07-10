import { APP_CONFIG } from './app';

export const CACHE_KEYS = {
  SMARTSHIP_TOKEN: 'vendor:token:smartship',
  SHIPROCKET_TOKEN: 'vendor:token:shiprocket',
  SHIPROCKET_B2B_TOKEN: 'vendor:token:shiprocket:b2b',
  DELHIVERY_TOKEN_5: 'vendor:token:delhivery:5',
  DELHIVERY_TOKEN_POINT_5: 'vendor:token:delhivery:0.5',
  DELHIVERY_TOKEN_10: 'vendor:token:delhivery:10',
  SHOPIFY_TOKEN: 'vendor:token:shopify',
} as const;

export const CACHE_TTL = {
  VENDOR_TOKEN: 2 * 60 * 60, // 2 hours
  PINCODE_DATA: 30 * 24 * 60 * 60, // 30 days
  // User-related caches
  USER_DATA: 600, // 10 minutes
  USER_PERMISSIONS: 900, // 15 minutes
  USER_WALLET: 300, // 5 minutes

  // Plan and pricing caches
  PLAN_DATA: 1800, // 30 minutes
  COURIER_RATES: 300, // 5 minutes
  ZONE_PRICING: 3600, // 1 hour

  // Location and pincode caches
  HUB_DATA: 1800, // 30 minutes

  // Shipping and order caches
  SHIPPING_RATES: 300, // 5 minutes
  ORDER_SUMMARY: 3600, // 1 hour
  SHIPMENT_STATUS: 1800, // 30 minutes

  // Business logic caches
  BILLING_SUMMARY: 1800, // 30 minutes
  DASHBOARD_METRICS: 600, // 10 minutes
  REPORT_DATA: 3600, // 1 hour

  // Session and auth caches
  SESSION_DATA: 3600, // 1 hour
  AUTH_TOKENS: 7200, // 2 hours

  // Rate limiting
  RATE_LIMIT_WINDOW: 3600, // 1 hour

  // Background jobs and tracking
  JOB_STATUS: 1800, // 30 minutes
  TRACKING_DATA: 900, // 15 minutes
} as const;

export const CACHE_PREFIXES = {
  USER: 'user',
  PLAN: 'plan',
  COURIER: 'courier',
  RATES: 'rates',
  PINCODE: 'pincode',
  HUB: 'hub',
  ORDER: 'order',
  SHIPMENT: 'shipment',
  BILLING: 'billing',
  DASHBOARD: 'dashboard',
  SESSION: 'session',
  METRICS: 'metrics',
  LOCK: 'lock',
  RATE_LIMIT: 'ratelimit',
  TRACKING: 'tracking',
  NOTIFICATION: 'notification',
} as const;

export const CACHE_TAGS = {
  USER_DATA: 'user-data',
  PLAN_DATA: 'plan-data',
  COURIER_DATA: 'courier-data',
  ORDER_DATA: 'order-data',
  BILLING_DATA: 'billing-data',
  SHIPPING_DATA: 'shipping-data',
} as const;

export const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  MAX_MEMORY_POLICY: 'allkeys-lru',
  COMPRESSION_THRESHOLD: 1024, // 1KB
  BATCH_SIZE: 100,
  
  // Redis key patterns
  PATTERNS: {
    USER_WILDCARD: `${CACHE_PREFIXES.USER}:*`,
    PLAN_WILDCARD: `${CACHE_PREFIXES.PLAN}:*`,
    RATES_WILDCARD: `${CACHE_PREFIXES.RATES}:*`,
    SESSION_WILDCARD: `${CACHE_PREFIXES.SESSION}:*`,
  },

  // Cache invalidation strategies
  INVALIDATION: {
    USER_UPDATE: [CACHE_TAGS.USER_DATA],
    PLAN_UPDATE: [CACHE_TAGS.PLAN_DATA, CACHE_TAGS.COURIER_DATA],
    ORDER_UPDATE: [CACHE_TAGS.ORDER_DATA, CACHE_TAGS.BILLING_DATA],
    BILLING_UPDATE: [CACHE_TAGS.BILLING_DATA],
  },
} as const;

export const REDIS_CONFIG = {
  host: APP_CONFIG.REDIS.HOST,
  port: APP_CONFIG.REDIS.PORT,
  password: APP_CONFIG.REDIS.PASSWORD,
  prefix: APP_CONFIG.REDIS.PREFIX,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000,
  maxmemoryPolicy: 'allkeys-lru',
} as const;
