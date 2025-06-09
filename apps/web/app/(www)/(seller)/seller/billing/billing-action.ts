'use server';

import { cache } from 'react';

// Define the shipment data type
export interface ShippingCharge {
  id: string;
  orderId: string;
  awbNumber: string;
  courier: string;
  shipmentStatus: string;
  awbAssignedDate: string;
  appliedWeight: number;
  excessWeight: number;
  onHoldAmount: number;
  totalFreightCharges: number;
  enteredWeight: string;
  enteredDimensions: string;
  chargedWeight: string;
  chargedDimensions: string;
}

// API response type
export interface ApiResponse {
  data: ShippingCharge[];
  meta: {
    total: number;
    pageCount: number;
  };
}

export interface ShipmentParams {
  page?: number;
  pageSize?: number;
  sort?: { id: string; desc: boolean }[];
  filters?: { id: string; value: any }[];
  globalFilter?: string;
  dateRange?: { from: Date; to: Date };
  status?: string;
}

// Sample data - in real app, this would come from database
const shipmentData: ShippingCharge[] = [
  {
    id: '1',
    orderId: '12473894-16',
    awbNumber: '7786334579',
    courier: 'Bluedart brands 500 g Surface',
    shipmentStatus: 'Pickup Generated',
    awbAssignedDate: '25 May, 2025',
    appliedWeight: 53.31,
    excessWeight: 0,
    onHoldAmount: 0.0,
    totalFreightCharges: 53.31,
    enteredWeight: '0.5 kg',
    enteredDimensions: '1x1x1 cm',
    chargedWeight: '0.5 kg',
    chargedDimensions: '1x1x1 cm',
  },
  {
    id: '2',
    orderId: '12473876-16',
    awbNumber: '7786334644',
    courier: 'Bluedart brands 500 g Surface',
    shipmentStatus: 'Pickup Generated',
    awbAssignedDate: '25 May, 2025',
    appliedWeight: 67.71,
    excessWeight: 0,
    onHoldAmount: 0.0,
    totalFreightCharges: 67.71,
    enteredWeight: '0.5 kg',
    enteredDimensions: '1x1x1 cm',
    chargedWeight: '0.5 kg',
    chargedDimensions: '1x1x1 cm',
  },
  {
    id: '3',
    orderId: '12473875-12',
    awbNumber: '7786334811',
    courier: 'Bluedart brands 500 g Surface',
    shipmentStatus: 'Pickup Generated',
    awbAssignedDate: '25 May, 2025',
    appliedWeight: 67.71,
    excessWeight: 0,
    onHoldAmount: 0.0,
    totalFreightCharges: 67.71,
    enteredWeight: '0.5 kg',
    enteredDimensions: '1x1x1 cm',
    chargedWeight: '0.5 kg',
    chargedDimensions: '1x1x1 cm',
  },
  {
    id: '4',
    orderId: '12473719-12',
    awbNumber: '7786334910',
    courier: 'Bluedart brands 500 g Surface',
    shipmentStatus: 'Pickup Generated',
    awbAssignedDate: '25 May, 2025',
    appliedWeight: 68.51,
    excessWeight: 0,
    onHoldAmount: 0.0,
    totalFreightCharges: 68.51,
    enteredWeight: '0.5 kg',
    enteredDimensions: '1x1x1 cm',
    chargedWeight: '0.5 kg',
    chargedDimensions: '1x1x1 cm',
  },
  {
    id: '5',
    orderId: '12473717-10',
    awbNumber: '7786333952',
    courier: 'Bluedart brands 500 g Surface',
    shipmentStatus: 'Pickup Generated',
    awbAssignedDate: '25 May, 2025',
    appliedWeight: 114.37,
    excessWeight: 0,
    onHoldAmount: 0.0,
    totalFreightCharges: 114.37,
    enteredWeight: '0.5 kg',
    enteredDimensions: '1x1x1 cm',
    chargedWeight: '0.5 kg',
    chargedDimensions: '1x1x1 cm',
  },
];

// Get initial shipments - no caching, pure SSR
export async function getInitialShipments(params: ShipmentParams): Promise<ApiResponse> {
  const { page = 0, pageSize = 15, sort, filters, globalFilter, dateRange, status } = params;

  // Simulate database call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return fetchShippingChargesReport({
    page,
    pageSize,
    sort,
    filters,
    globalFilter,
    dateRange,
    status,
  });
}

// Server action for client-side queries
export async function fetchShippingChargesReport(params: ShipmentParams): Promise<ApiResponse> {
  const { page = 0, pageSize = 15, sort, filters, globalFilter, dateRange, status } = params;

  // Filter by status if provided
  let filteredShipments = shipmentData;
  if (status && status !== 'all') {
    const statusMap: Record<string, string> = {
      new: 'New',
      ready: 'Pickup Scheduled',
      transit: 'In Transit',
      delivered: 'Delivered',
      rto: 'RTO',
    };

    if (statusMap[status]) {
      filteredShipments = filteredShipments.filter(
        (shipment) => shipment.shipmentStatus === statusMap[status]
      );
    }
  }

  // Apply filters
  if (filters && filters.length > 0) {
    filteredShipments = filteredShipments.filter((shipment) => {
      return filters.every((filter) => {
        if (filter.id === 'status' && Array.isArray(filter.value)) {
          return filter.value.includes(shipment.shipmentStatus);
        }
        if (filter.id === 'paymentType' && Array.isArray(filter.value)) {
          return filter.value.includes(shipment.courier);
        }
        return true;
      });
    });
  }

  // Apply global filter
  if (globalFilter) {
    const searchTerm = globalFilter.toLowerCase();
    filteredShipments = filteredShipments.filter(
      (shipment) =>
        shipment.orderId.toLowerCase().includes(searchTerm) ||
        shipment.awbNumber.toLowerCase().includes(searchTerm)
    );
  }

  // Apply date range filter
  if (dateRange?.from && dateRange?.to) {
    filteredShipments = filteredShipments.filter((shipment) => {
      const createdAt = new Date(shipment.awbAssignedDate);
      return createdAt >= dateRange.from && createdAt <= dateRange.to;
    });
  }

  // Apply sorting
  if (sort && sort.length > 0) {
    const sortItem = sort[0];
    if (sortItem && typeof sortItem.id === 'string') {
      const { id, desc } = sortItem;
      filteredShipments = [...filteredShipments].sort((a: any, b: any) => {
        if (a[id] < b[id]) return desc ? 1 : -1;
        if (a[id] > b[id]) return desc ? -1 : 1;
        return 0;
      });
    }
  }

  // Apply pagination
  const start = page * pageSize;
  const end = start + pageSize;
  const paginatedShipments = filteredShipments.slice(start, end);

  return {
    data: paginatedShipments,
    meta: {
      total: filteredShipments.length,
      pageCount: Math.ceil(filteredShipments.length / pageSize),
    },
  };
}

// Bulk action server actions
export async function downloadManifest(shipmentIds: string[]) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return { success: true, count: shipmentIds.length };
}

export async function generateLabels(shipmentIds: string[]) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return { success: true, count: shipmentIds.length };
}

export async function cancelOrders(shipmentIds: string[]) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return { success: true, count: shipmentIds.length };
}
