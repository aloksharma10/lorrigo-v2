import { Command, GalleryVerticalEnd, FileText, Users, CreditCard, MapPin, Activity } from 'lucide-react';

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
        icon: Command,
      },
      {
        title: 'Reverse Shipment',
        url: '/admin/orders/reverse-shipments/all',
        icon: Command,
      },
      {
        title: 'NDR',
        url: '/admin/orders/ndr',
        icon: Command,
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
        icon: Command,
      },
      {
        title: 'Weight Freeze',
        url: '/admin/weight-management/weight-freeze',
        icon: Command,
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
    icon: Activity,
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
        icon: Command,
      },
      {
        title: 'Shipping Charges',
        url: '/admin/billing/shipping-charges',
        icon: Command,
      },
      {
        title: 'COD Remittance',
        url: '/admin/billing/cod-remittances',
        icon: Command,
      },
      {
        title: 'Invoices',
        url: '/admin/billing/invoices',
        icon: FileText,
        un_dev: true,
      },
    ],
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: Users,
    isActive: false,
  },
  {
    title: 'Wallet',
    url: '/admin/wallets',
    icon: CreditCard,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Pincodes',
    url: '/admin/pincodes',
    icon: MapPin,
    isActive: false,
    un_dev: true,
  },
  {
    title: 'Courier Statuses',
    url: '/admin/courier-statuses',
    icon: Activity,
    isActive: false,
    un_dev: true,
  },
];
