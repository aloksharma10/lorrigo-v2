import { ChartCard } from "@/components/charts/chart-card"
import { PieChart } from "@/components/charts/pie-chart"
import { SimpleDataTable } from "@lorrigo/ui/components"
import { Badge } from "@lorrigo/ui/components"
import { Button } from "@lorrigo/ui/components"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@lorrigo/ui/components"
import Link from "next/link"

// Sample data for orders summary
const ordersSummaryData = [
   {
      date: "2025-05-21",
      totalOrders: 823,
      pickupUnscheduled: 0,
      pickupScheduled: 169,
      inTransit: 654,
      delivered: 0,
      undelivered: 0,
      rto: 0,
      lostDamaged: 0,
      cancelled: 0,
   },
   {
      date: "2025-05-20",
      totalOrders: 734,
      pickupUnscheduled: 0,
      pickupScheduled: 105,
      inTransit: 606,
      delivered: 21,
      undelivered: 2,
      rto: 0,
      lostDamaged: 0,
      cancelled: 0,
   },
   {
      date: "2025-05-19",
      totalOrders: 1089,
      pickupUnscheduled: 0,
      pickupScheduled: 111,
      inTransit: 757,
      delivered: 146,
      undelivered: 75,
      rto: 0,
      lostDamaged: 0,
      cancelled: 0,
   },
   {
      date: "2025-05-18",
      totalOrders: 120,
      pickupUnscheduled: 0,
      pickupScheduled: 16,
      inTransit: 102,
      delivered: 0,
      undelivered: 2,
      rto: 0,
      lostDamaged: 0,
      cancelled: 0,
   },
   {
      date: "2025-05-17",
      totalOrders: 549,
      pickupUnscheduled: 0,
      pickupScheduled: 46,
      inTransit: 207,
      delivered: 240,
      undelivered: 56,
      rto: 0,
      lostDamaged: 0,
      cancelled: 0,
   },
   {
      date: "2025-05-16",
      totalOrders: 693,
      pickupUnscheduled: 0,
      pickupScheduled: 59,
      inTransit: 175,
      delivered: 305,
      undelivered: 144,
      rto: 9,
      lostDamaged: 1,
      cancelled: 0,
   },
   {
      date: "2025-05-15",
      totalOrders: 828,
      pickupUnscheduled: 0,
      pickupScheduled: 71,
      inTransit: 163,
      delivered: 405,
      undelivered: 160,
      rto: 29,
      lostDamaged: 0,
      cancelled: 0,
   },
]

// Sample data for prepaid vs COD orders
const paymentTypeData = [
   { name: "Prepaid", value: 5800, percentage: "65%" },
   { name: "COD", value: 3200, percentage: "35%" },
]

// Sample data for popular order locations
const popularLocationsData = [
   {
      state: "Maharashtra",
      orderCount: 2487,
      revenue: "₹56,65,876",
      revenuePercentage: "14.72%",
   },
   {
      state: "Uttar pradesh",
      orderCount: 1906,
      revenue: "₹26,12,751",
      revenuePercentage: "10.69%",
   },
   {
      state: "Karnataka",
      orderCount: 1481,
      revenue: "₹22,82,698",
      revenuePercentage: "9.17%",
   },
   {
      state: "Delhi",
      orderCount: 1119,
      revenue: "₹15,86,564",
      revenuePercentage: "7.76%",
   },
   {
      state: "Gujarat",
      orderCount: 1008,
      revenue: "₹19,97,311",
      revenuePercentage: "6.42%",
   },
   {
      state: "Tamil nadu",
      orderCount: 981,
      revenue: "₹12,14,856",
      revenuePercentage: "4.85%",
   },
]

// Sample data for top customers
const topCustomersData = [
   {
      customerName: "Sumitomo",
      orderCount: 38,
      revenue: "₹52,000",
   },
   {
      customerName: "Nidhi Batra",
      orderCount: 23,
      revenue: "₹14,260",
   },
   {
      customerName: "ULLAS ARAMEX",
      orderCount: 7,
      revenue: "₹75,763",
   },
   {
      customerName: "JAYSHANKAR PONDICHERRY",
      orderCount: 6,
      revenue: "₹41,700",
   },
   {
      customerName: "SPORTSJAM SHOWROOM",
      orderCount: 6,
      revenue: "₹1,37,150",
   },
   {
      customerName: "Navin Gogoi",
      orderCount: 5,
      revenue: "₹1,829",
   },
]

// Sample data for top products
const topProductsData = [
   {
      productName: "Microfiber",
      unitSold: 1274,
      revenue: "₹9,67,764",
   },
   {
      productName: "Microfiber",
      unitSold: 414,
      revenue: "₹2,84,667",
   },
   {
      productName: "Zilo Coin Attract Money Prosperity - BUY 2 Rs.808",
      unitSold: 365,
      revenue: "₹2,94,920",
   },
   {
      productName: "Cyberbolt X8",
      unitSold: 352,
      revenue: "₹3,15,846",
   },
   {
      productName: "Vacation Start Part Co-Ord set - COMBO BLACK+WHITE M",
      unitSold: 164,
      revenue: "₹1,73,456",
   },
]

export default function OrdersPage() {
   return (
      <div className="mx-auto p-4 space-y-6">

         <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Orders</h1>
            <div className="text-sm text-muted-foreground mb-6">
               All data in the Dashboard is displayed based on the Shipment assignment date.
            </div>
            {/* <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 border rounded-md p-2">
                     <CalendarIcon className="h-4 w-4" />
                     <span className="text-sm">22/04/2025 - 21/05/2025</span>
                     <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 border rounded-md p-2">
                     <span className="text-sm">Zone</span>
                     <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 border rounded-md p-2">
                     <span className="text-sm">Courier</span>
                     <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 border rounded-md p-2">
                     <span className="text-sm">Payment Mode</span>
                     <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 border rounded-md p-2">
                     <span className="text-sm">Shipment Mode</span>
                     <ChevronDown className="h-4 w-4" />
                  </div>
               </div> */}


            {/* Orders Summary Table */}
            <div className="mb-6">
               <SimpleDataTable
                     title="Orders Summary"
                     columns={[
                        {
                           header: "Date",
                           accessorKey: "date",
                           // cell: (value) => {
                           //    const date = new Date(value)
                           //    return date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
                           // },
                        },
                        { header: "Total Orders", accessorKey: "totalOrders" },
                        { header: "Pickup Unscheduled", accessorKey: "pickupUnscheduled" },
                        { header: "Pickup Scheduled", accessorKey: "pickupScheduled" },
                        { header: "In Transit", accessorKey: "inTransit" },
                        { header: "Delivered", accessorKey: "delivered" },
                        { header: "Undelivered", accessorKey: "undelivered" },
                        { header: "RTO", accessorKey: "rto" },
                        { header: "Lost/Damaged", accessorKey: "lostDamaged" },
                        { header: "Cancelled", accessorKey: "cancelled" },
                     ]}
                     data={ordersSummaryData}
                  
                  />
               <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm">
                     ← Previous
                  </Button>
                  <Button variant="outline" size="sm">
                     Next →
                  </Button>
               </div>
            </div>

            {/* Middle Section with 3 cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
               <ChartCard title="Prepaid vs. COD Orders">
                  <PieChart
                     data={paymentTypeData}
                     // tooltipFormatter={(value) => [`${value}`, "Orders"]}
                     showLegend={true}
                     legendPosition="bottom"
                  />
               </ChartCard>

               <ChartCard title="Address Quality score">
                  <div className="flex flex-col items-center justify-center h-full">
                     <div className="text-center mb-4">
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           width="48"
                           height="48"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="2"
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           className="mx-auto mb-2 text-muted-foreground"
                        >
                           <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" />
                           <path d="M12 13v8" />
                           <path d="M5 13v6a2 2 0 0 0 2 2h8" />
                        </svg>
                        <p className="text-sm text-muted-foreground">
                           Address quality data not found for the selected filters.
                        </p>
                     </div>
                  </div>
               </ChartCard>

               <SimpleDataTable
                  title="Most Popular Orders Location"
                  badge="Last 30 days"
                  columns={[
                     { header: "States", accessorKey: "state" },
                     { header: "Order Count", accessorKey: "orderCount" },
                     { header: "Revenue", accessorKey: "revenue" },
                     { header: "Revenue %", accessorKey: "revenuePercentage" },
                  ]}
                  data={popularLocationsData}
               />
            </div>

            {/* Bottom Section with 2 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <SimpleDataTable
                  title="Top 10 Customers"
                  columns={[
                     { header: "Customer Name", accessorKey: "customerName" },
                     { header: "Order Count", accessorKey: "orderCount" },
                     { header: "Revenue", accessorKey: "revenue" },
                  ]}
                  data={topCustomersData}
               />

               <SimpleDataTable
                  title="Top 10 Products"
                  columns={[
                     { header: "Product Name", accessorKey: "productName" },
                     { header: "Unit Sold", accessorKey: "unitSold" },
                     { header: "Revenue", accessorKey: "revenue" },
                  ]}
                  data={topProductsData}
               />
            </div>

            <div className="text-xs text-muted-foreground">
               Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
            </div>
         </div>
      </div>
   )
}
