/**
 * API endpoints for different courier vendors
 */
export const APIs = {
  // SmartShip API endpoints
  HUB_REGISTRATION: '/integration/user/hub/register',
  SMARTSHIP_AUTH: '/user/login',
  CREATE_SHIPMENT: '/integration/order',
  
  // Shiprocket API endpoints
  CREATE_PICKUP_LOCATION: '/settings/company/addpickup',
  CREATE_HUB_B2B_SHIPROCKET: '/warehouse',
  SHIPROCKET_AUTH: '/auth/login',
  CREATE_FORWARD_SHIPMENT: '/shipments/create/forward-shipment',
  
  // Delhivery API endpoints
  DELHIVERY_PICKUP_LOCATION: '/cmu/create.json',
  DELHIVERY_AUTH: '/auth/token',
  DELHIVERY_CREATE_ORDER: '/api/cmu/create.json',
};