// Backend order interface (matching your API response)

import { BackendOrder } from '@lorrigo/utils';

// API response for orders list
export interface OrdersApiResponse {
  orders: BackendOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Query parameters for fetching orders
export interface OrderQueryParams {
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export type Shipment = BackendOrder;

/* ************ Backend Order Form Values ************ */

// Additional types and functions for compatibility
export interface ShipmentParams {
  page: number;
  pageSize: number;
  sort: { id: string; desc: boolean }[];
  filters: { id: string; value: any }[];
  globalFilter: string;
  dateRange: { from: Date; to: Date };
  status: string;
}

export interface ApiResponse {
  data: BackendOrder[];
  meta: {
    total: number;
    pageCount: number;
    page: number;
    pageSize: number;
  };
}
