'use client';
import { ChartCard } from '@/components/charts/chart-card';
import { PieChart } from '@/components/charts/pie-chart';
import { SimpleDataTable, type Column } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@lorrigo/ui/components';
import Link from 'next/link';
import { useShipmentAnalysis } from '@/lib/hooks/use-shipment-analysis';
import type { ShipmentPerformanceAnalytics, ChannelAnalysisItem, ZonePerformanceItem, CourierPerformanceItem, WeightAnalysisItem } from '@/lib/type/shipment-analysis';

export default function OrdersPage() {
  const { performance, isTokenReady } = useShipmentAnalysis();
  const analytics: Partial<ShipmentPerformanceAnalytics> = performance.data || {};
  // Map fields from shipment-analysis API
  const overview = analytics.overview || {};
  const channelAnalysis = (analytics.channelAnalysis || []).map((item: ChannelAnalysisItem) => ({
    name: item.channel,
    value: item.totalOrders,
  }));
  const zonePerformance = (analytics.zonePerformance || []).map((item: ZonePerformanceItem) => ({
    zone: item.zone,
    totalShipments: item.totalShipments,
    delivered: item.delivered,
    rto: item.rto,
    lostDamaged: item.lostDamaged,
    successRate: item.successRate,
    averageDeliveryTime: item.averageDeliveryTime,
  }));
  const topCustomers = (analytics.courierPerformance || []).map((item: CourierPerformanceItem) => ({
    courierName: item.courierName,
    totalShipments: item.totalShipments,
    delivered: item.delivered,
    rto: item.rto,
    lostDamaged: item.lostDamaged,
    onTimeDelivery: item.onTimeDelivery,
    delayedDelivery: item.delayedDelivery,
    successRate: item.successRate,
    averageDeliveryTime: item.averageDeliveryTime,
    ndrCount: item.ndrCount,
    ndrResolved: item.ndrResolved,
  }));
  const topProducts = (analytics.weightAnalysis || []).map((item: WeightAnalysisItem) => ({
    weightRange: item.weightRange,
    count: item.count,
    percentage: item.percentage,
    averageDeliveryTime: item.averageDeliveryTime,
    successRate: item.successRate,
  }));

  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="text-muted-foreground mb-6 text-sm">
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
              { header: 'Total Shipments', accessorKey: 'totalShipments' },
              { header: 'Delivered', accessorKey: 'delivered' },
              { header: 'In Transit', accessorKey: 'inTransit' },
              { header: 'Pending', accessorKey: 'pending' },
              { header: 'RTO', accessorKey: 'rto' },
              { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
              { header: 'On Time Delivery', accessorKey: 'onTimeDelivery' },
              { header: 'Delayed Delivery', accessorKey: 'delayedDelivery' },
              { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
              { header: 'Success Rate', accessorKey: 'successRate' },
            ] as Column<any>[]}
            data={overview ? [overview] : []}
            isLoading={performance.isLoading}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm">
              ← Previous
            </Button>
            <Button variant="outline" size="sm">
              Next →
            </Button>
          </div>
        </div>

        {/* Middle Section with 3 cards */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <ChartCard title="Prepaid vs. COD Orders">
            <PieChart
              data={channelAnalysis}
              showLegend={true}
              legendPosition="bottom"
            />
          </ChartCard>

          <ChartCard title="Address Quality score">
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-4 text-center">
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
                  className="text-muted-foreground mx-auto mb-2"
                >
                  <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" />
                  <path d="M12 13v8" />
                  <path d="M5 13v6a2 2 0 0 0 2 2h8" />
                </svg>
                <p className="text-muted-foreground text-sm">
                  Address quality data not found for the selected filters.
                </p>
              </div>
            </div>
          </ChartCard>

          <SimpleDataTable
            title="Most Popular Orders Location"
            badge="Last 30 days"
            columns={[
              { header: 'Zone', accessorKey: 'zone' },
              { header: 'Total Shipments', accessorKey: 'totalShipments' },
              { header: 'Delivered', accessorKey: 'delivered' },
              { header: 'RTO', accessorKey: 'rto' },
              { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
              { header: 'Success Rate', accessorKey: 'successRate' },
              { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
            ] as Column<any>[]}
            data={zonePerformance}
            isLoading={performance.isLoading}
          />
        </div>

        {/* Bottom Section with 2 cards */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <SimpleDataTable
            title="Top 10 Customers"
            columns={[
              { header: 'Courier Name', accessorKey: 'courierName' },
              { header: 'Total Shipments', accessorKey: 'totalShipments' },
              { header: 'Delivered', accessorKey: 'delivered' },
              { header: 'RTO', accessorKey: 'rto' },
              { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
              { header: 'On Time Delivery', accessorKey: 'onTimeDelivery' },
              { header: 'Delayed Delivery', accessorKey: 'delayedDelivery' },
              { header: 'Success Rate', accessorKey: 'successRate' },
              { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
              { header: 'NDR Count', accessorKey: 'ndrCount' },
              { header: 'NDR Resolved', accessorKey: 'ndrResolved' },
            ] as Column<any>[]}
            data={topCustomers}
            isLoading={performance.isLoading}
          />

          <SimpleDataTable
            title="Top 10 Products"
            columns={[
              { header: 'Weight Range', accessorKey: 'weightRange' },
              { header: 'Count', accessorKey: 'count' },
              { header: 'Percentage', accessorKey: 'percentage' },
              { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
              { header: 'Success Rate', accessorKey: 'successRate' },
            ] as Column<any>[]}
            data={topProducts}
            isLoading={performance.isLoading}
          />
        </div>

        <div className="text-muted-foreground text-xs">
          Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
        </div>
      </div>
    </div>
  );
}
