import { Command, GalleryVerticalEnd } from 'lucide-react';

export const ADMIN_ROUTES = [
  {
    title: 'Home',
    url: '/admin/home',
    icon: GalleryVerticalEnd,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: GalleryVerticalEnd,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Orders',
    url: '/admin/orders',
    icon: Command,
    isActive: true,
    un_dev: true,
    items: [
      {
        title: 'Forward Shipment',
        url: '/admin/orders/forward-shipments/all',
      },
      {
        title: 'Reverse Shipment',
        url: '/admin/orders/reverse-shipments/all',
      },
      {
        title: 'NDR',
        url: '/admin/orders/ndr',
      },
    ],
  },
  {
    title: 'Weight Management',
    url: '/admin/weight-management',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Weight Discrepancy',
        url: '/admin/billing/weight-disputes',
      },
      {
        title: 'Weight Freeze',
        url: '/admin/weight-management/weight-freeze',
        un_dev: true,
      },
      // {
      //    title: "All Shipment",
      //    url: "/admin/all-shipment",
      // },
    ],
  },
  {
    title: 'Plans',
    url: '/admin/plans',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Manage Plans',
        url: '/admin/plans',
        icon: Command,
        isActive: false,
      },
    ],
  },
  {
    title: 'Setup & Manage',
    url: '/admin/setup-manage',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Channels',
        url: '/admin/setup-manage/channels',
        icon: Command,
        isActive: false,
      },
      {
        title: 'Courier',
        url: '/admin/setup-manage/couriers',
        icon: Command,
        isActive: false,
      },
      {
        title: 'Customers',
        url: '/admin/setup-manage/customers',
        icon: Command,
        isActive: false,
      },
      {
        title: 'Products',
        url: '/admin/setup-manage/products',
        icon: Command,
        isActive: false,
      },
    ],
  },
  {
    title: 'Bulk Activity Log',
    url: '/admin/bulk-activity-logs',
    icon: Command,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Billing',
    url: '/admin/billing',
    icon: Command,
    isActive: false,
    items: [
      {
        title: 'Billing Cycles',
        url: '/admin/billing/cycles',
      },
      {
        title: 'Shipping Charges',
        url: '/admin/billing/shipping-charges',
      },
      {
        title: 'COD Remittance',
        url: '/admin/billing/cod-remittances',
      },
      {
        title: 'Invoices',
        url: '/admin/billing/invoices',
        un_dev: true,
      },
    ],
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: Command,
    isActive: false,
  },
  {
    title: 'Wallet',
    url: '/admin/wallets',
    icon: Command,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Pincodes',
    url: '/admin/pincodes',
    icon: Command,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Courier Statuses',
    url: '/admin/courier-statuses',
    icon: Command,
    isActive: false,
    un_dev: true,
  },
];
