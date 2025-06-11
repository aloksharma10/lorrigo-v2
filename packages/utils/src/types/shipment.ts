import { ShipmentStatus } from '@lorrigo/db';

/**
 * Shared types for shipment operations across frontend and backend
 */

export interface CreateShipmentRequest {
  orderId: string;
  courierId: string;
}

export interface ShipmentRateResponse {
  id: string;
  name: string;
  nickname: string;
  courier_code: string;
  type: string;
  is_active: boolean;
  is_reversed_courier: boolean;
  estimated_delivery_days: number;
  etd: string;
  pickup_time?: string;
  expected_pickup?: string;
  rating?: number;
  pickup_performance?: number;
  delivery_performance?: number;
  rto_performance?: number;
  zone: string;
  weight_slab: number;
  final_weight: number;
  volumetric_weight: number;
  base_price: number;
  weight_charges: number;
  cod_charges: number;
  rto_charges: number;
  total_price: number;
  breakdown?: any;
}

export interface ShipmentResponse {
  id: string;
  code: string;
  awb?: string;
  status: ShipmentStatus;
  shipping_charge: number;
  fw_charge: number;
  cod_amount?: number;
  rto_charge: number;
  order_zone: string;
  edd: string | Date;
  pickup_date: string | Date;
  pickup_id: string;
  order_id: string;
  user_id: string;
  courier_id: string;
  courier?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface SchedulePickupRequest {
  shipmentId: string;
  pickupDate: string;
}

export interface CancelShipmentRequest {
  shipmentId: string;
  reason?: string;
}

export interface TrackingEventRequest {
  status: ShipmentStatus;
  location: string;
  description: string;
}

export interface TrackingEventResponse {
  id: string;
  code: string;
  status: ShipmentStatus;
  location?: string;
  description?: string;
  shipment_id: string;
  timestamp: string | Date;
}

export interface BulkShipmentRequest {
  shipments: CreateShipmentRequest[];
  filters?: {
    status?: string;
    dateRange?: [string, string];
  };
}

export interface BulkPickupRequest {
  pickups: SchedulePickupRequest[];
  filters?: {
    status?: ShipmentStatus;
    dateRange?: [string, string];
  };
}

export interface BulkCancelRequest {
  cancellations: CancelShipmentRequest[];
  filters?: {
    status?: ShipmentStatus;
    dateRange?: [string, string];
  };
}

export interface BulkOperationResponse {
  id: string;
  code: string;
  type: string;
  status: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  progress: number;
  results?: Array<{
    id: string;
    success: boolean;
    message: string;
    data?: any;
  }>;
  created_at: string | Date;
  updated_at: string | Date;
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
  courier: any;
  seller_gst?: string;
  is_reshipped?: boolean;
} 