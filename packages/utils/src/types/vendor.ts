/**
 * Shared types for vendor operations across frontend and backend
 */

export interface VendorRegistrationResult {
  success: boolean;
  message: string;
  data: any;
}

export interface VendorServiceabilityResult {
  success: boolean;
  message: string;
  serviceableCouriers: Array<{
    id: string;
    name: string;
    code: string;
    serviceability: boolean;
    data?: any;
  }>;
}

export interface VendorShipmentResult {
  success: boolean;
  message: string;
  awb?: string;
  routingCode?: string;
  data: any;
}

export interface VendorPickupResult {
  success: boolean;
  message: string;
  data: any;
}

export interface VendorCancellationResult {
  success: boolean;
  message: string;
  data: any;
}

// export interface PickupAddress {
//   facilityName: string;
//   contactPersonName?: string;
//   phone: string;
//   address: string;
//   city: string;
//   state: string;
//   pincode: string | number;
//   isRTOAddressSame?: boolean;
//   rtoAddress?: string;
//   rtoPincode?: string | number;
//   rtoCity?: string;
//   rtoState?: string;
// }

export interface ShipmentPickupData {
  awb: string;
  pickupDate: string;
  hub: any;
  shipment: any;
}

export interface ShipmentCancelData {
  awb: string;
  shipment: any;
}

export interface CourierServiceabilityData {
  id: string;
  name: string;
  code: string;
  serviceability: boolean;
  pricing?: any;
  vendor?: string;
  data?: {
    min_weight?: number;
    estimated_delivery_days?: number;
    etd?: string;
    rating?: number;
    pickup_performance?: number;
    rto_performance?: number;
    delivery_performance?: number;
    zone?: string;
  };
} 