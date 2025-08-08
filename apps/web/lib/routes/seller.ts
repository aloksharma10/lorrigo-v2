import {
  Boxes,
  Command,
  FileText,
  GitCompare,
  GitPullRequestDraft,
  IndianRupee,
  ListTodo,
  ReceiptTextIcon,
  Sigma,
  SquareSigma,
  Tickets,
  UsersRound,
  Weight,
  Truck,
  MapPin,
} from 'lucide-react';
import { Home, LayoutDashboard, ClipboardList, FilePlus, RotateCcw, AlertCircle } from 'lucide-react';

export const SELLER_ROUTES = [
  {
    title: 'Home',
    url: '/seller/home',
    icon: Home,
    isActive: false,
  },
  {
    title: 'Dashboard',
    url: '/seller/dashboard',
    icon: LayoutDashboard,
    isActive: false,
  },
  {
    title: 'Orders',
    icon: ClipboardList,
    isActive: true,
    items: [
      {
        title: 'Add Order',
        url: '/seller/orders/new',
        icon: FilePlus,
      },
      {
        title: 'Forward Shipments',
        url: '/seller/orders/forward-shipments/all',
        icon: Truck,
      },
      {
        title: 'Reverse Shipments',
        url: '/seller/orders/reverse-shipments/all',
        icon: RotateCcw,
      },
      {
        title: 'NDR',
        url: '/seller/orders/ndr/action-required',
        icon: AlertCircle,
      },
    ],
  },
  {
    title: 'Weight Management',
    url: '/seller/weight-management',
    icon: Weight,
    isActive: false,
    items: [
      {
        title: 'Weight Discrepancy',
        url: '/seller/billing/weight-disputes/pending',
        icon: AlertCircle,
      },
      // {
      //   title: 'Weight Freeze',
      //   url: '/seller/weight-freeze',
      // },
      // {
      //    title: "All Shipment",
      //    url: "/seller/all-shipment",
      // },
    ],
  },
  {
    title: 'Setup & Manage',
    url: '/seller/setup-manage',
    icon: GitPullRequestDraft,
    isActive: false,
    items: [
      {
        title: 'Channels',
        url: '/seller/channels',
        icon: GitCompare,
        isActive: false,
      },
      {
        title: 'Couriers',
        url: '/seller/couriers',
        icon: Truck,
        isActive: false,
      },
      {
        title: 'Pickup Addresses',
        url: '/seller/pickup-addresses',
        icon: MapPin,
        isActive: false,
      },
      {
        title: 'Customers',
        url: '/seller/customers',
        icon: UsersRound,
        isActive: false,
      },
      {
        title: 'Products',
        url: '/seller/products',
        icon: Boxes,
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
        icon: Sigma,
      },
      {
        title: 'Bulk Activity Log',
        url: '/seller/bulk-log',
        icon: ListTodo,
      },
    ],
  },
  {
    title: 'Billing',
    url: '/seller/billing',
    icon: ReceiptTextIcon,
    isActive: false,
    items: [
      {
        title: 'Shipping Charges',
        url: '/seller/billing/shipping-charges',
        icon: IndianRupee,
      },
      {
        title: 'COD Remittances',
        url: '/seller/billing/cod-remittances',
        icon: Tickets,
      },
      {
        title: 'Invoices',
        url: '/seller/billing/invoices',
        icon: FileText,
        un_dev: true,
      },
    ],
  },
];


export type SellerSettingsTab = {
  id: string;
  name: string;
  iconName: string;
};

export const SELLER_SETTINGS_TABS: SellerSettingsTab[] = [
  { id: 'general', name: 'General', iconName: 'Home' },
  // { id: 'billing', name: 'Billing', iconName: 'BadgeIndianRupee' },
  { id: 'bank-accounts', name: 'Bank Accounts', iconName: 'CreditCard' },
  // { id: 'webhook', name: 'Webhooks', iconName: 'Link' },
  // { id: 'api', name: 'API', iconName: 'Settings' },
  { id: 'notifications', name: 'Notifications', iconName: 'Bell' },
  // { id: 'security', name: 'Security', iconName: 'Lock' },
];

export function generateSellerSettingsRoutes() {
  return SELLER_SETTINGS_TABS.map((tab) => ({
    id: tab.id,
    name: tab.name,
    path: `/seller/settings/${tab.id}`,
    iconName: tab.iconName,
  }));
}