'use server';

import { cache } from 'react';

// Define the shipment data type
export interface Shipment {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  paymentType: 'Prepaid' | 'COD';
  pickupAddress: string;
  addressVerified: boolean;
  shippingService: string;
  awbNumber: string;
  status: 'New' | 'Pickup Scheduled' | 'In Transit' | 'Delivered' | 'RTO';
  pickupDate: string;
  edd: string;
  pickupId: string;
  custom: boolean;
  createdAt: Date;
}

// API response type
export interface ApiResponse {
  data: Shipment[];
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
const allShipments: Shipment[] = [
  {
    id: '11235-8',
    orderNumber: '11235-8',
    customerName: 'Naveen J N',
    customerEmail: 'noreply@orrigo.com',
    customerPhone: '9094982543',
    amount: 2796.0,
    paymentType: 'Prepaid',
    pickupAddress: 'Canine Cravin',
    addressVerified: false,
    shippingService: 'BlueDart Surface 2Kg_Spl',
    awbNumber: '77514658082',
    status: 'Pickup Scheduled',
    pickupDate: '23 May 2025',
    edd: '24 May 2025',
    pickupId: 'SRPD-35836182',
    custom: true,
    createdAt: new Date('2025-05-22T01:11:00'),
  },
  {
    id: 'LSRC0277_TC_SS_COD_8',
    orderNumber: 'LSRC0277_TC_SS_COD_8',
    customerName: 'Alok Sharma',
    customerEmail: 'noreply@shiprocket.com',
    customerPhone: '7011609262',
    amount: 489.0,
    paymentType: 'COD',
    pickupAddress: 'Tristar',
    addressVerified: false,
    shippingService: 'Bluedart brands 500 g Surface',
    awbNumber: '77860021466',
    status: 'Pickup Scheduled',
    pickupDate: '23 May 2025',
    edd: '27 May 2025',
    pickupId: 'SRPD-35844479',
    custom: true,
    createdAt: new Date('2025-05-22T01:10:00'),
  },
  {
    id: '#0010819-6',
    orderNumber: '#0010819-6',
    customerName: 'TUTU SANGLIR',
    customerEmail: 'noreply@orrigo.com',
    customerPhone: '9366117942',
    amount: 5997.0,
    paymentType: 'Prepaid',
    pickupAddress: 'Sukri Delhi',
    addressVerified: false,
    shippingService: 'BlueDart Surface 2Kg_Spl',
    awbNumber: '77514658282',
    status: 'Pickup Scheduled',
    pickupDate: '23 May 2025',
    edd: '28 May 2025',
    pickupId: 'SRPD-36444668',
    custom: true,
    createdAt: new Date('2025-05-22T01:09:00'),
  },
  {
    id: '12439099-2',
    orderNumber: '12439099-2',
    customerName: 'Praveen Dasari',
    customerEmail: 'noreply@shiprocket.com',
    customerPhone: '8121440440',
    amount: 1299.0,
    paymentType: 'Prepaid',
    pickupAddress: 'Parcel084',
    addressVerified: false,
    shippingService: 'Bluedart brands 500 g Surface',
    awbNumber: '77514738744',
    status: 'New',
    pickupDate: '22 May 2025',
    edd: '29 May 2025',
    pickupId: 'SRPD-35819352',
    custom: true,
    createdAt: new Date('2025-05-22T01:56:00'),
  },
  {
    id: '12439071-14',
    orderNumber: '12439071-14',
    customerName: 'Arbaz Khan',
    customerEmail: 'noreply@shiprocket.com',
    customerPhone: '8217350462',
    amount: 1453.0,
    paymentType: 'Prepaid',
    pickupAddress: 'Parcel084',
    addressVerified: false,
    shippingService: 'Bluedart brands 500 g Surface',
    awbNumber: '77514732610',
    status: 'In Transit',
    pickupDate: '22 May 2025',
    edd: '29 May 2025',
    pickupId: 'SRPD-35819352',
    custom: true,
    createdAt: new Date('2025-05-22T01:53:00'),
  },
  {
    id: '12438936-6',
    orderNumber: '12438936-6',
    customerName: 'Bhausheb Gadade',
    customerEmail: 'noreply@shiprocket.com',
    customerPhone: '9561886193',
    amount: 1156.0,
    paymentType: 'Prepaid',
    pickupAddress: 'Parcel143',
    addressVerified: false,
    shippingService: 'Bluedart brands 500 g Surface',
    awbNumber: '77514713334',
    status: 'Delivered',
    pickupDate: '22 May 2025',
    edd: '29 May 2025',
    pickupId: 'SRPD-35846042',
    custom: true,
    createdAt: new Date('2025-05-22T01:42:00'),
  },
  {
    id: '682956-13',
    orderNumber: '682956-13',
    customerName: 'Testing User',
    customerEmail: 'test@example.com',
    customerPhone: '9876543210',
    amount: 3000.0,
    paymentType: 'COD',
    pickupAddress: 'Vantage Pro Office',
    addressVerified: true,
    shippingService: 'Bluedart brands 500 g Surface',
    awbNumber: '77514713335',
    status: 'RTO',
    pickupDate: '22 May 2025',
    edd: '29 May 2025',
    pickupId: 'SRPD-35846043',
    custom: true,
    createdAt: new Date('2025-05-22T01:40:00'),
  },
];

// Get initial shipments - no caching, pure SSR
export async function getInitialShipments(params: ShipmentParams): Promise<ApiResponse> {
  const { page = 0, pageSize = 15, sort, filters, globalFilter, dateRange, status } = params;

  // Simulate database call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return fetchShipments({
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
export async function fetchShipments(params: ShipmentParams): Promise<ApiResponse> {
  const { page = 0, pageSize = 15, sort, filters, globalFilter, dateRange, status } = params;

  // Filter by status if provided
  let filteredShipments = allShipments;
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
        (shipment) => shipment.status === statusMap[status]
      );
    }
  }

  // Apply filters
  if (filters && filters.length > 0) {
    filteredShipments = filteredShipments.filter((shipment) => {
      return filters.every((filter) => {
        if (filter.id === 'status' && Array.isArray(filter.value)) {
          return filter.value.includes(shipment.status);
        }
        if (filter.id === 'paymentType' && Array.isArray(filter.value)) {
          return filter.value.includes(shipment.paymentType);
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
        shipment.orderNumber.toLowerCase().includes(searchTerm) ||
        shipment.customerName.toLowerCase().includes(searchTerm) ||
        shipment.customerEmail.toLowerCase().includes(searchTerm) ||
        shipment.customerPhone.toLowerCase().includes(searchTerm) ||
        shipment.awbNumber.toLowerCase().includes(searchTerm) ||
        shipment.pickupId.toLowerCase().includes(searchTerm)
    );
  }

  // Apply date range filter
  if (dateRange?.from && dateRange?.to) {
    filteredShipments = filteredShipments.filter((shipment) => {
      const createdAt = new Date(shipment.createdAt);
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
