import { ChartCard } from "@/components/charts/chart-card"
import { PieChart } from "@/components/charts/pie-chart"
import { SimpleDataTable } from "@lorrigo/ui/components"
import { BarChart } from "@/components/charts/bar-chart"
import { CalendarIcon, ChevronDown } from "lucide-react"

// Sample data for courier-wise shipments
const courierShipmentData = [
   {
      courier: "Bluedart Surface 500 g Surface",
      totalShipments: "16,757 / 17.8%\n6,763",
      delivered: "51.4% / 3.0%\n48.9%",
      rto: "43.4% / 17.8%\n37.3%",
      lostDamaged: "0.8% / 0.0%\n0.1%",
      pickupWithinSLA: "0% / 0%\n0%",
      deliveredWithinSLA: "88.4% / 0.4%\n99.0%",
      ndrRaised: "34.39% / 6.2%\n40.3%",
      ndrDelivered: "27.4% / 4.7%\n32.0%",
   },
   {
      courier: "Bluedart Surface 2Kg_5Kg",
      totalShipments: "387 / 26.3%\n254",
      delivered: "23.1% / 0.7%\n56.8%",
      rto: "0.5% / 0.7%\n0.0%",
      lostDamaged: "0% / 0%\n0%",
      pickupWithinSLA: "0% / 0%\n0%",
      deliveredWithinSLA: "87.0% / 1.8%\n95.0%",
      ndrRaised: "6.56% / 0.0%\n9.4%",
      ndrDelivered: "91.2% / 0.5%\n91.7%",
   },
   {
      courier: "Blue Dart Air",
      totalShipments: "119 / 7.6%\n101",
      delivered: "84.0% / 2.0%\n96.0%",
      rto: "0% / 2.0%\n2.0%",
      lostDamaged: "0% / 0%\n0%",
      pickupWithinSLA: "0% / 0%\n0%",
      deliveredWithinSLA: "88.0% / 2.0%\n100.0%",
      ndrRaised: "10.08% / 1.0%\n12.9%",
      ndrDelivered: "83.3% / 1.3%\n84.6%",
   },
   {
      courier: "Delivery Air",
      totalShipments: "36 / 20.0%\n24",
      delivered: "86.7% / 13.3%\n100.0%",
      rto: "0% / 0%\n0%",
      lostDamaged: "0% / 0%\n0%",
      pickupWithinSLA: "0% / 0%\n0%",
      deliveredWithinSLA: "92.3% / 0.0%\n92.3%",
      ndrRaised: "10.00% / 6.7%\n16.7%",
      ndrDelivered: "66.7% / 33.3%\n100.0%",
   },
   {
      courier: "Xpressbees Surface",
      totalShipments: "7 / 69.6%\n23",
      delivered: "57.1% / 8.7%\n65.2%",
      rto: "0% / 34.8%\n34.8%",
      lostDamaged: "0% / 0%\n0%",
      pickupWithinSLA: "0% / 0%\n0%",
      deliveredWithinSLA: "100.0% / 0.7%\n93.3%",
      ndrRaised: "14.29% / 4.2%\n56.5%",
      ndrDelivered: "40% / 0.5%\n30.8%",
   },
   {
      courier: "Others",
      totalShipments: "16 / 71.4%\n35",
      delivered: "60.0% / 20.6%\n80.6%",
      rto: "0% / 11.4%\n11.4%",
      lostDamaged: "0% / 0%\n0%",
      pickupWithinSLA: "0% / 0%\n0%",
      deliveredWithinSLA: "100.0% / 3.2%\n96.8%",
      ndrRaised: "0.00% / 0.6%\n9.1%",
      ndrDelivered: "0% / 0%\n0%",
   },
]

// Sample data for zone-wise shipments
const zoneShipmentData = [
   { name: "Bluedart Surface 500 g Surface", Delivered: 3500, RTO: 2900, "Lost/Damage": 50 },
   { name: "Bluedart Surface 2Kg_5Kg", Delivered: 220, RTO: 30, "Lost/Damage": 0 },
   { name: "Blue Dart Air", Delivered: 100, RTO: 2, "Lost/Damage": 0 },
   { name: "Delivery Air", Delivered: 30, RTO: 0, "Lost/Damage": 0 },
   { name: "Xpressbees Surface", Delivered: 15, RTO: 8, "Lost/Damage": 0 },
   { name: "Others", Delivered: 28, RTO: 4, "Lost/Damage": 0 },
]

// Sample data for weight profile
const weightProfileData = [
   { name: "0-1 Kgs", value: 8500, percentage: "65%" },
   { name: "0.1-1 Kgs", value: 3200, percentage: "25%" },
   { name: "1-1.5 Kgs", value: 800, percentage: "6%" },
   { name: "1.5-2 Kgs", value: 400, percentage: "3%" },
   { name: "2-5 Kgs", value: 100, percentage: "1%" },
]

// Sample data for shipment zone
const shipmentZoneData = [
   { name: "Zone A", value: 1200, percentage: "10%" },
   { name: "Zone B", value: 2400, percentage: "20%" },
   { name: "Zone C", value: 1800, percentage: "15%" },
   { name: "Zone D", value: 6000, percentage: "50%" },
   { name: "Zone E", value: 600, percentage: "5%" },
]

// Sample data for shipment channel
const shipmentChannelData = [
   { channel: "Custom", orders: 36 },
   { channel: "external", orders: 5172 },
   { channel: "wrapperr", orders: 12213 },
]

export default function ShipmentsPage() {
   return (
      <>
         <div className="mx-auto p-4 space-y-6">
            <div className="flex flex-col">
               <h1 className="text-2xl font-bold">Shipment</h1>
               {/* Date Range, Zone, Courier, Payment Mode, Shipment Mode Filters */}
               {/* <div className="flex items-center gap-4 my-4">
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
               
               <div className="text-sm text-muted-foreground mb-6">
                  All data in the Dashboard is displayed based on the Shipment assignment date.
               </div>

               {/* Courier-wise Shipments Table */}
               <div className="mb-6">
                  <SimpleDataTable
                     title="Courier wise Shipments"
                     columns={[
                        { header: "Courier", accessorKey: "courier" },
                        { header: "Total Shipments", accessorKey: "totalShipments" },
                        { header: "Delivered", accessorKey: "delivered" },
                        { header: "RTO", accessorKey: "rto" },
                        { header: "Lost/Damaged", accessorKey: "lostDamaged" },
                        { header: "Pickup within SLA", accessorKey: "pickupWithinSLA" },
                        { header: "Delivered within SLA", accessorKey: "deliveredWithinSLA" },
                        { header: "NDR Raised", accessorKey: "ndrRaised" },
                        { header: "NDR Delivered", accessorKey: "ndrDelivered" },
                     ]}
                     data={courierShipmentData}
                  // onExternalLinkClick={() => { }}
                  />
               </div>

               {/* Zone-wise Shipments Chart */}
               <div className="mb-6">
                  <ChartCard
                     title="Zone Wise Shipments"
                  // onExternalLinkClick={() => { }}
                  >
                     <BarChart
                        data={zoneShipmentData}
                        bars={[
                           { dataKey: "Delivered", color: "#4ade80" },
                           { dataKey: "RTO", color: "#818cf8" },
                           { dataKey: "Lost/Damage", color: "#f87171" },
                        ]}
                        height={300}
                     />
                  </ChartCard>
               </div>

               {/* Bottom Section with 3 cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <SimpleDataTable
                     title="Shipment's Channel"
                     columns={[
                        { header: "Channels", accessorKey: "channel" },
                        { header: "Orders", accessorKey: "orders" },
                     ]}
                     data={shipmentChannelData}
                  />

                  <ChartCard title="Weight Profile (in Kgs)"
                  // onExternalLinkClick={() => { }}
                  >
                     <PieChart
                        data={weightProfileData}
                        // tooltipFormatter={(value) => [`${value}`, "Shipments"]}
                        showLegend={true}
                        legendPosition="bottom"
                     />
                  </ChartCard>

                  <ChartCard title="Shipment's Zone"
                  // onExternalLinkClick={() => { }}
                  >
                     <PieChart
                        data={shipmentZoneData}
                        // tooltipFormatter={(value) => [`${value}`, "Shipments"]}
                        showLegend={true}
                        legendPosition="bottom"
                     />
                  </ChartCard>
               </div>

               <div className="text-xs text-muted-foreground">
                  Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
               </div>
            </div>
         </div>
      </>
   )
}
