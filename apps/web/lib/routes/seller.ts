
import { Command, GalleryVerticalEnd } from "lucide-react"

export const SELLER_ROUTES = [
   {
      title: "Home",
      url: "/seller/home",
      icon: GalleryVerticalEnd,
      isActive: false,
   },
   {
      title: "Dashboard",
      url: "/seller/dashboard",
      icon: GalleryVerticalEnd,
      isActive: false,
   },
   {
      title: "Orders",
      url: "/seller/orders/new",
      icon: Command,
      isActive: true,
      items: [
         {
            title: "Forward Shipment",
            url: "/seller/orders/forward-shipment",
         },
         {
            title: "Reverse Shipment",
            url: "/seller/orders/reverse-shipment",
         },
         {
            title: "NDR",
            url: "/seller/orders/ndr",
         },
      ],
   },
   {
      title: "Weight Management",
      url: "/seller/weight-management",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Weight Discrepancy",
            url: "/seller/weight-discrepancy",
         },
         {
            title: "Weight Freeze",
            url: "/seller/weight-freeze",
         },
         // {
         //    title: "All Shipment",
         //    url: "/seller/all-shipment",
         // },
      ],
   },
   {
      title: "Setup & Manage",
      url: "/seller/setup-manage",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Channels",
            url: "/seller/channels",
            icon: Command,
            isActive: false,
         },
         {
            title: "Courier",
            url: "/seller/courier",
            icon: Command,
            isActive: false,
         },
         {
            title: "Customers",
            url: "/seller/customers",
            icon: Command,
            isActive: false,
         },
         {
            title: "Products",
            url: "/seller/products",
            icon: Command,
            isActive: false,
         }
      ]
   },
   {
      title: "Tools",
      url: "/seller/tools",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Rate Calculator",
            url: "/seller/rate-calculator",
         },
         {
            title: "Rate Card",
            url: "/seller/rate-card",
         },
         {
            title: "Bulk Actions",
            url: "/seller/bulk-actions",
         },
         {
            title: "Bulk Activity Log",
            url: "/seller/bulk-activity-log",
         },
      ],
   },
   {
      title: "Billing",
      url: "/seller/billing",
      icon: Command,
      isActive: false,
      items: [
         {
            title: "Shipping Charges",
            url: "/seller/shipping-charges",
         },
         {
            title: "COD Remittance",
            url: "/seller/cod-remittance",
         },
         {
            title: "Invoices",
            url: "/seller/invoices",
         },
      ],
   },
]