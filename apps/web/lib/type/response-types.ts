
// Backend order interface (matching your API response)
export interface BackendOrder {
   id: string;
   orderNumber: string;
   status: string;
   totalAmount: number;
   customerId: string;
   customerName: string;
   paymentType: string;
   amountToCollect: number;
   awb: string;
   trackingEvents: Array<{
      description: string;
      code: string;
      status: string;
      timestamp: string;
   }>;
   pickupDate: string;
   edd: string;
   pickupId: string;
   customer?: {
      id: string;
      name: string;
      email: string;
      phone: string;
   };
   packageDetails: {
      length: number;
      breadth: number;
      height: number;
      deadWeight: number;
      volumetricWeight: number;
   };
   hub?: {
      name: string;
      lorrigoPickupId: string;
      address: string;
   };
   shippingAddress?: {
      id: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
   };
   shipments?: Array<{
      id: string;
      trackingNumber: string;
      status: string;
   }>;
   notes?: string;
   createdAt: string;
   updatedAt: string;
}

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