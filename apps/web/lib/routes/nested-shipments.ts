export const SHIPMENT_TAB_ROUTES = [
  { name: 'New', path: '/seller/orders/forward-shipments/new' },
  { name: 'Ready To Ship', path: '/seller/orders/forward-shipments/ready-to-ship' },
  { name: 'In Transit', path: '/seller/orders/forward-shipments/transit' },
  { name: 'Delivered', path: '/seller/orders/forward-shipments/delivered' },
  { name: 'RTO', path: '/seller/orders/forward-shipments/rto' },
  { name: 'All', path: '/seller/orders/forward-shipments/all' },
];

export const NDR_TAB_ROUTES = [
  { name: 'Action Required', path: '/seller/orders/ndr/action-required' },
  { name: 'Action Requested', path: '/seller/orders/ndr/action-requested' },
  { name: 'Delivered', path: '/seller/orders/ndr/delivered' },
  { name: 'RTO', path: '/seller/orders/ndr/rto' },
];

export const WEIGHT_DISPUTE_TAB_ROUTES = [
  { name: 'Pending', path: '/seller/billing/weight-disputes/pending' },
  { name: 'Raised by You', path: '/seller/billing/weight-disputes/raised-by-you' },
  { name: 'Resolved', path: '/seller/billing/weight-disputes/resolved' },
  { name: 'Rejected', path: '/seller/billing/weight-disputes/rejected' },
  { name: 'All', path: '/seller/billing/weight-disputes/all' },
];