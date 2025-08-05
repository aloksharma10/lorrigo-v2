// Types for analytics API responses

export interface OrdersSummaryItem {
  date: string;
  totalOrders: number;
  pickupUnscheduled: number;
  pickupScheduled: number;
  inTransit: number;
  delivered: number;
  undelivered: number;
  rto: number;
  lostDamaged: number;
  cancelled: number;
}

export interface PaymentTypeSplitItem {
  name: string; // 'Prepaid' | 'COD'
  value: number;
  percentage: string;
}

export interface PopularLocationItem {
  state: string;
  orderCount: number;
  revenue: number;
  revenuePercentage: string;
}

export interface TopCustomerItem {
  customerName: string;
  orderCount: number;
  revenue: number;
}

export interface TopProductItem {
  productName: string;
  unitSold: number;
  revenue: number;
}

export interface OrdersAnalytics {
  summary: OrdersSummaryItem[];
  paymentTypeSplit: PaymentTypeSplitItem[];
  popularLocations: PopularLocationItem[];
  topCustomers: TopCustomerItem[];
  topProducts: TopProductItem[];
}

export interface OverviewAnalytics {
  ordersToday: number;
  revenueToday: number;
  shipments: {
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    rto: number;
  };
  ndr: {
    total: number;
    reattempts: number;
    delivered: number;
  };
  // Add more fields as needed
}

// Add more interfaces for each analytics endpoint/component

// Shipments Analytics Types
export interface CourierWiseShipmentItem {
  courier: string;
  totalShipments: string;
  delivered: string;
  rto: string;
  lostDamaged: string;
  pickupWithinSLA: string;
  deliveredWithinSLA: string;
  ndrRaised: string;
  ndrDelivered: string;
}

export interface ZoneShipmentItem {
  name: string;
  Delivered: number;
  RTO: number;
  'Lost/Damage': number;
}

export interface WeightProfileItem {
  name: string;
  value: number;
  percentage: string;
}

export interface ShipmentZoneItem {
  name: string;
  value: number;
  percentage: string;
}

export interface ShipmentChannelItem {
  channel: string;
  orders: number;
}

export interface ShipmentStatusItem {
  name: string; // e.g. 'Delivered', 'In Transit', 'RTO', etc.
  value: number;
}

export interface DeliveryPerformanceItem {
  name: string; // e.g. 'On Time', 'Late'
  value: number;
}

export interface ShipmentOverviewItem {
  courierName: string;
  pickupUnscheduled: number;
  pickupScheduled: number;
  inTransit: number;
  delivered: number;
  rto: number;
  lostDamaged: number;
  totalShipment: number;
}

export interface ShipmentsAnalytics {
  courierWise: CourierWiseShipmentItem[];
  zoneWise: ZoneShipmentItem[];
  weightProfile: WeightProfileItem[];
  shipmentZone: ShipmentZoneItem[];
  shipmentChannel: ShipmentChannelItem[];
  shipmentStatus: ShipmentStatusItem[];
  deliveryPerformance: DeliveryPerformanceItem[];
  shipmentOverview: ShipmentOverviewItem[];
}

// NDR Analytics Types
export interface NdrMetrics {
  raised: string;
  percentage: string;
  actionRequired: string;
  delivered: string;
  rto: string;
}

export interface NdrResponseSummary {
  sellerResponse: number;
  buyerResponse: number;
  sellerPositiveResponse: number;
  buyerPositiveResponse: number;
  sellerPositiveResponseDelivered: number;
  buyerPositiveResponseDelivered: number;
}

export interface NdrFunnel {
  firstNDR: { total: string; pending: number; delivered: string };
  secondNDR: { total: string; pending: number; delivered: number };
  thirdNDR: { total: string; pending: number; delivered: number };
}

export interface NdrReasonSplitItem {
  name: string;
  value: number;
  percentage: string;
}

export interface NdrStatusSplitItem {
  name: string;
  Delivered: number;
  RTO: number;
  Pending: number;
}

export interface NdrResponsesByAttemptItem {
  category: string;
  ndrShipments: number;
  firstNDRAttempt: number;
  firstNDRDelivered: number;
  secondNDRAttempt: number;
  secondNDRDelivered: number;
  thirdNDRAttempt: number;
  thirdNDRDelivered: number;
  totalDelivered: number;
  totalRTO: number;
  lostDamaged: number;
}

export interface NdrVsDeliveryAttemptItem {
  name: string;
  ndrRaised: number;
  deliveryAttempt: number;
}

export interface NdrSellerBuyerResponseItem {
  name: string;
  ndr: number;
  sellerResponse?: number;
  buyerResponse?: number;
}

export interface NdrSuccessByCourierItem {
  name: string;
  total: number;
  zoneA: number;
  zoneB: number;
  zoneC: number;
  zoneD: number;
  zoneE: number;
}

export interface NdrReasonTableItem {
  reason: string;
  total: number;
  pending: number;
  delivered: number;
  rto: number;
  lostDamaged: number;
}

export interface NdrAnalytics {
  metrics: NdrMetrics;
  responseSummary: NdrResponseSummary;
  funnel: NdrFunnel;
  reasonSplit: NdrReasonSplitItem[];
  statusSplit: NdrStatusSplitItem[];
  responsesByAttempt: NdrResponsesByAttemptItem[];
  vsDeliveryAttempt: NdrVsDeliveryAttemptItem[];
  sellerResponse: NdrSellerBuyerResponseItem[];
  buyerResponse: NdrSellerBuyerResponseItem[];
  successByCourier: NdrSuccessByCourierItem[];
  reasonTable: NdrReasonTableItem[];
}

// RTO Analytics Types
export interface RtoMetrics {
  total: number;
  percentage: string;
  initiated: number;
  undelivered: number;
  delivered: number;
}

export interface RtoCountOverTimeItem {
  name: string;
  rtoCount: number;
}

export interface RtoStatusItem {
  name: string;
  rtoInitiated: number;
  rtoDelivered: number;
  rtoUndelivered: number;
}

export interface RtoReasonItem {
  name: string;
  value: number;
  percentage: string;
}

export interface RtoTopByPincodeItem {
  pincode: string;
  rtoCount: number;
  percentage: string;
}

export interface RtoTopByCityItem {
  city: string;
  rtoCount: number;
  percentage: string;
}

export interface RtoTopByCourierItem {
  name: string;
  rtoCount: number;
  percentage: string;
}

export interface RtoTopByCustomerItem {
  name: string;
  rtoCount: number;
  percentage: string;
}

export interface RtoAnalytics {
  metrics: RtoMetrics;
  countOverTime: RtoCountOverTimeItem[];
  status: RtoStatusItem[];
  reasons: RtoReasonItem[];
  topByPincode: RtoTopByPincodeItem[];
  topByCity: RtoTopByCityItem[];
  topByCourier: RtoTopByCourierItem[];
  topByCustomer: RtoTopByCustomerItem[];
}
