import {
  Boxes,
  Command,
  FileText,
  GalleryVerticalEnd,
  GitCompare,
  GitPullRequestDraft,
  IndianRupee,
  ListTodo,
  ReceiptTextIcon,
  Settings,
  Sigma,
  SquareSigma,
  Tickets,
  UsersRound,
  Weight,
  Truck,
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
        title: 'Rate Card',
        url: '/seller/rate-card',
        icon: SquareSigma,
        un_dev: true,
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
