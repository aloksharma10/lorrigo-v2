/**
 * API endpoints for different courier vendors
 */
export const APIs = {
  // SmartShip API endpoints
  SMART_SHIP: {
    SMARTSHIP_AUTH: '/user/login',
    HUB_REGISTRATION: '/hubRegistration',
    HUB_UPDATE: '/updateHubDetails',
    HUB_DELETE: '/deleteHub',
    HUB_SERVICEABILITY: '/ServiceabilityHubWise',
    RATE_CALCULATION: '/rateCalculator',
    CREATE_SHIPMENT: '/orderRegistrationOneStep',
    CANCEL_SHIPMENT: '/orderCancellation',
    ORDER_REATTEMPT: '/orderReattempt',
    ORDER_MANIFEST: '/createManifest',
    TRACK_SHIPMENT: '/v1/Trackorder?order_reference_ids', // url => TRACK_SHIPMENT+"=order_reference_id"
    PIN_CODE: 'https://uat.smartr.in/api/v1/pincode/',
  },

  // Shiprocket API endpoints
  SHIPROCKET: {
    AUTH: '/auth/login',
    CREATE_PICKUP_LOCATION: '/settings/company/addpickup',
    ORDER_COURIER: '/courier/serviceability',
    LIST_COURIER: '/courier/courierListWithCounts',
    UPDATE_ORDER: '/orders/update/adhoc',
    UPDATE_CUSTOMER: '/orders/update/customer',
    CREATE_RETURN_ORDER: '/orders/create/return',
    GET_MANIFEST: '/manifests/generate',
    CANCEL_ORDER: '/orders/cancel',
    CANCEL_SHIPMENT: '/orders/cancel/shipment/awbs',
    ORDER_STATUS: '/shipments/status',
    ORDER_NDR: '/courier/track',
    
    CREATE_ORDER: '/orders/create/adhoc',
    GENRATE_AWB: '/courier/assign/awb',

    CREATE_FORWARD_SHIPMENT_WRAPPER: '/shipments/create/forward-shipment',
  },

  // Shiprocket B2B API endpoints
  SHIPROCKET_B2B: {
    CREATE_HUB: '/settings/company/addpickup',
  },

  // Delhivery API endpoints
  DELHIVERY: {
    PINCODE_SERVICEABILITY: '/c/api/pin-codes/json/?filter_codes=',
    PICKUP_LOCATION: '/api/backend/clientwarehouse/create/',
    CREATE_ORDER: '/api/cmu/create.json',
    CANCEL_ORDER: '/api/p/edit',
    TRACK_ORDER: '/api/v1/packages/json/?waybill=',
    MANIFEST_ORDER: '/fm/request/new',
  },

  // Shopify API endpoints
  SHOPIFY_OAUTH: '/admin/oauth/authorize',
  SHOPIFY_TOKEN: '/admin/oauth/access_token',
  SHOPIFY_ORDERS: '/admin/api/{version}/orders.json',
  SHOPIFY_ORDER: '/admin/api/{version}/orders/{id}.json',
  SHOPIFY_CUSTOMERS: '/admin/api/{version}/customers.json',
  SHOPIFY_CUSTOMER: '/admin/api/{version}/customers/{id}.json',
};
