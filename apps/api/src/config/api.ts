/**
 * API endpoints for different courier vendors
 */
export const APIs = {
  // SmartShip API endpoints
  HUB_REGISTRATION: '/integration/user/hub/register',
  SMARTSHIP_AUTH: '/user/login',
  
  // Shiprocket API endpoints
  CREATE_PICKUP_LOCATION: '/settings/company/addpickup',
  CREATE_HUB_B2B_SHIPROCKET: '/warehouse',
  SHIPROCKET_AUTH: '/auth/login',
  
  // Delhivery API endpoints
  DELHIVERY_PICKUP_LOCATION: '/cmu/create.json',
  DELHIVERY_AUTH: '/auth/token',
};