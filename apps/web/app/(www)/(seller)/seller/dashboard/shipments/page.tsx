'use client';
import { ChartCard } from '@/components/charts/chart-card';
import { PieChart } from '@/components/charts/pie-chart';
import { SimpleDataTable } from '@lorrigo/ui/components';
import { BarChart } from '@/components/charts/bar-chart';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { useShipmentAnalysis } from '@/lib/hooks/use-shipment-analysis';
import type { ShipmentPerformanceAnalytics } from '@/lib/type/shipment-analysis';

export default function ShipmentsPage() {
  // Use the unified shipment analysis hook
  const { performance, isTokenReady } = useShipmentAnalysis();
  const analytics: ShipmentPerformanceAnalytics | {} = performance.data || {};
  const isLoading = performance.isLoading;

  // Map courier performance to table format
  const courierTableData = (Array.isArray((analytics as ShipmentPerformanceAnalytics).courierPerformance) ? (analytics as ShipmentPerformanceAnalytics).courierPerformance : []).map((item: any) => ({
    courier: item.courierName,
    totalShipments: item.totalShipments,
    delivered: item.delivered,
    rto: item.rto,
    lostDamaged: item.lostDamaged,
    pickupWithinSLA: item.onTimeDelivery, // Assuming onTimeDelivery means within SLA
    deliveredWithinSLA: item.onTimeDelivery, // Same as above
    ndrRaised: item.ndrCount,
    ndrDelivered: item.ndrResolved,
  }));

  // Map zone performance to chart format
  const zoneChartData = (Array.isArray((analytics as ShipmentPerformanceAnalytics).zonePerformance) ? (analytics as ShipmentPerformanceAnalytics).zonePerformance : []).map((item: any) => ({
    name: item.zone,
    Delivered: item.delivered,
    RTO: item.rto,
    'Lost/Damage': item.lostDamaged,
  }));

  // Map channel analysis to table format
  const channelTableData = (Array.isArray((analytics as ShipmentPerformanceAnalytics).channelAnalysis) ? (analytics as ShipmentPerformanceAnalytics).channelAnalysis : []).map((item: any) => ({
    channel: item.channel,
    orders: item.totalOrders,
  }));

  // Map weight analysis to pie chart format
  const weightProfileData = (Array.isArray((analytics as ShipmentPerformanceAnalytics).weightAnalysis) ? (analytics as ShipmentPerformanceAnalytics).weightAnalysis : []).map((item: any) => ({
    name: item.weightRange,
    value: item.count,
  }));

  // Map zone performance to pie chart format
  const shipmentZoneData = (Array.isArray((analytics as ShipmentPerformanceAnalytics).zonePerformance) ? (analytics as ShipmentPerformanceAnalytics).zonePerformance : []).map((item: any) => ({
    name: item.zone,
    value: item.totalShipments,
  }));

  return (
    <>
      <div className="mx-auto space-y-6 p-4">
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

          <div className="text-muted-foreground mb-6 text-sm">
            All data in the Dashboard is displayed based on the Shipment assignment date.
          </div>

          {/* Courier-wise Shipments Table */}
          <div className="mb-6">
            <SimpleDataTable
              title="Courier wise Shipments"
              columns={[
                { header: 'Courier', accessorKey: 'courier' },
                { header: 'Total Shipments', accessorKey: 'totalShipments' },
                { header: 'Delivered', accessorKey: 'delivered' },
                { header: 'RTO', accessorKey: 'rto' },
                { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
                { header: 'Pickup within SLA', accessorKey: 'pickupWithinSLA' },
                { header: 'Delivered within SLA', accessorKey: 'deliveredWithinSLA' },
                { header: 'NDR Raised', accessorKey: 'ndrRaised' },
                { header: 'NDR Delivered', accessorKey: 'ndrDelivered' },
              ]}
              data={courierTableData}
              isLoading={isLoading}
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
                data={zoneChartData}
                bars={[
                  { dataKey: 'Delivered', color: '#4ade80' },
                  { dataKey: 'RTO', color: '#818cf8' },
                  { dataKey: 'Lost/Damage', color: '#f87171' },
                ]}
                height={300}
              />
            </ChartCard>
          </div>

          {/* Bottom Section with 3 cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <SimpleDataTable
              title="Shipment's Channel"
              columns={[
                { header: 'Channels', accessorKey: 'channel' },
                { header: 'Orders', accessorKey: 'orders' },
              ]}
              data={channelTableData}
              isLoading={isLoading}
            />

            <ChartCard
              title="Weight Profile (in Kgs)"
              // onExternalLinkClick={() => { }}
            >
              <PieChart
                data={weightProfileData}
                // tooltipFormatter={(value) => [`${value}`, "Shipments"]}
                showLegend={true}
                legendPosition="bottom"
              />
            </ChartCard>

            <ChartCard
              title="Shipment's Zone"
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

          <div className="text-muted-foreground text-xs">
            Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
          </div>
        </div>
      </div>
    </>
  );
}
