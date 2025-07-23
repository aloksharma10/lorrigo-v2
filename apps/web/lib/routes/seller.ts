import { Command, GalleryVerticalEnd } from 'lucide-react';

export const SELLER_ROUTES = [
  {
    title: 'Home',
    url: '/seller/home',
    icon: GalleryVerticalEnd,
    isActive: false,
  },
  {
    title: 'Dashboard',
    url: '/seller/dashboard',
    icon: GalleryVerticalEnd,
    isActive: false,
  },
  {
    title: 'Orders',
    icon: Command,
    isActive: true,
    items: [
      {
        title: 'Add Order',
        url: '/seller/orders/new',
      },
      {
        title: 'Forward Shipments',
        url: '/seller/orders/forward-shipments/all',
      },
      {
        title: 'Reverse Shipments',
        url: '/seller/orders/reverse-shipments/all',
      },
      {
        title: 'NDR',
        url: '/seller/orders/ndr/action-required',
      },
    ],
  },
  {
    title: 'Weight Management',
    url: '/seller/weight-management',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Weight Discrepancy',
        url: '/seller/weight-discrepancy',
      },
      {
        title: 'Weight Freeze',
        url: '/seller/weight-freeze',
      },
      // {
      //    title: "All Shipment",
      //    url: "/seller/all-shipment",
      // },
    ],
  },
  {
    title: 'Setup & Manage',
    url: '/seller/setup-manage',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Channels',
        url: '/seller/channels',
        icon: Command,
        isActive: false,
      },
      {
        title: 'Couriers',
        url: '/seller/couriers',
        icon: Command,
        isActive: false,
      },
      {
        title: 'Customers',
        url: '/seller/customers',
        icon: Command,
        isActive: false,
      },
      {
        title: 'Products',
        url: '/seller/products',
        icon: Command,
        isActive: false,
      },
    ],
  },
  {
    title: 'Tools',
    url: '/seller/tools',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Rate Calculator',
        url: '/seller/rate-calculator',
      },
      {
        title: 'Rate Card',
        url: '/seller/rate-card',
      },
      {
        title: 'Bulk Activity Log',
        url: '/seller/bulk-log',
      },
    ],
  },
  {
    title: 'Billing',
    url: '/seller/billing',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Shipping Charges',
        url: '/seller/billing/shipping-charges',
      },
      {
        title: 'COD Remittances',
        url: '/seller/billing/cod-remittances',
      },
      {
        title: 'Invoices',
        url: '/seller/billing/invoices',
      },
    ],
  },
];
