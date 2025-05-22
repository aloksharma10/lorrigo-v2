
import { Command, GalleryVerticalEnd } from "lucide-react"

export const ADMIN_ROUTES = [
   {
      title: "Home",
      url: "/admin/home",
      icon: GalleryVerticalEnd,
      isActive: false,
   },
   {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: GalleryVerticalEnd,
      isActive: false,
   },
   {
      title: "Orders",
      url: "/admin/orders",
      icon: Command,
      isActive: true,
      items: [
         {
            title: "Forward Shipment",
            url: "/admin/orders/forward-shipments",
         },
         {
            title: "Reverse Shipment",
            url: "/admin/orders/reverse-shipments",
         },
         {
            title: "NDR",
            url: "/admin/orders/ndr",
         },
      ],
   },
   {
      title: "Weight Management",
      url: "/admin/weight-management",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Weight Discrepancy",
            url: "/admin/weight-discrepancy",
         },
         {
            title: "Weight Freeze",
            url: "/admin/weight-freeze",
         },
         // {
         //    title: "All Shipment",
         //    url: "/admin/all-shipment",
         // },
      ],
   },
   {
      title: "Setup & Manage",
      url: "/admin/setup-manage",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Channels",
            url: "/admin/channels",
            icon: Command,
            isActive: false,
         },
         {
            title: "Courier",
            url: "/admin/couriers",
            icon: Command,
            isActive: false,
         },
         {
            title: "Customers",
            url: "/admin/customers",
            icon: Command,
            isActive: false,
         },
         {
            title: "Products",
            url: "/admin/products",
            icon: Command,
            isActive: false,
         }
      ]
   },
   {
      title: "Tools",
      url: "/admin/tools",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Rate Calculator",
            url: "/admin/rate-calculator",
         },
         {
            title: "Rate Card",
            url: "/admin/rate-card",
         },
         {
            title: "Bulk Activity Log",
            url: "/admin/bulk-activity-logs",
         },
      ],
   },
   {
      title: "Billing",
      url: "/admin/billing",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Shipping Charges",
            url: "/admin/shipping-charges",
         },
         {
            title: "COD Remittance",
            url: "/admin/cod-remittances",
         },
         {
            title: "Invoices",
            url: "/admin/invoices",
         },
      ],
   },
   {
      title: "Users",
      url: "/admin/users",
      icon: Command,
      isActive: false,
   },
   {
      title: "Wallet",
      url: "/admin/wallets",
      icon: Command,
      isActive: false,
   },
   {
      title: "Pincodes",
      url: "/admin/pincodes",
      icon: Command,
      isActive: false,
   },
   {
      title: "Courier Statuses",
      url: "/admin/courier-statuses",
      icon: Command,
      isActive: false,
   }
]