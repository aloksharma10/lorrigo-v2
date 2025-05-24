export const CACHE_KEYS = {
   SMARTSHIP_TOKEN: 'vendor:token:smartship',
   SHIPROCKET_TOKEN: 'vendor:token:shiprocket',
   SHIPROCKET_B2B_TOKEN: 'vendor:token:shiprocket:b2b',
   DELHIVERY_TOKEN_5: 'vendor:token:delhivery:5',
   DELHIVERY_TOKEN_POINT_5: 'vendor:token:delhivery:0.5',
   DELHIVERY_TOKEN_10: 'vendor:token:delhivery:10',
};

/**
 * Cache TTL in seconds for different items
 */
export const CACHE_TTL = {
   VENDOR_TOKEN: 23 * 60 * 60, // 23 hours (tokens usually expire in 24 hours)
   PINCODE_DATA: 30 * 24 * 60 * 60, // 30 days
}; 