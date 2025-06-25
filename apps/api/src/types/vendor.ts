/**
 * Types for vendor operations
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
  pickup_date?: string;
  data: any;
}

export interface VendorPickupResult {
  success: boolean;
  message: string;
  pickup_date: string | null;
  data: any;
}

export interface VendorCancellationResult {
  success: boolean;
  message: string;
  data: any;
}

export interface VendorTrackingResult {
  success: boolean;
  message: string;
  data: any;
  trackingEvents: TrackingEventData[];
  cached?: boolean;
}

/**
 * Tracking event data structure
 */
export interface TrackingEventData {
  status: string;
  status_code: string;
  description: string;
  location: string;
  timestamp: Date;
  activity: string;
  isRTO: boolean;
  isNDR: boolean;
  bucket?: number;
  vendor_name?: string;
  raw_data?: any;
}

export interface VendorShipmentData {
  order: any;
  hub: any;
  orderItems: any[];
  paymentMethod: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  courier?: any;
  seller_gst?: string;
  isSchedulePickup?: boolean;
  pickupDate?: string;
}

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

export interface ShipmentTrackingData {
  awb: string;
  courier?: string;
  shipment?: {
    id: string;
    status: string;
  };
  shipmentId?: string;
}

export type VendorRegistrationData = {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
};
