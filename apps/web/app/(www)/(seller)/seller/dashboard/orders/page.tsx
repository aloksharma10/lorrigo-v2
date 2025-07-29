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
import type {
  ShipmentPerformanceAnalytics,
  ChannelAnalysisItem,
  ZonePerformanceItem,
  CourierPerformanceItem,
  WeightAnalysisItem,
  TopCustomerItem,
} from '@/lib/type/shipment-analysis';

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
  const topCustomers = (analytics.topCustomers || []).map((item: TopCustomerItem) => ({
    customerName: item.customerName,
    totalShipments: item.totalShipments,
    delivered: item.delivered,
    rto: item.rto,
    lostDamaged: item.lostDamaged,
    successRate: item.successRate,
    averageDeliveryTime: item.averageDeliveryTime,
    totalRevenue: item.totalRevenue,
    averageOrderValue: item.averageOrderValue,
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
        <div className="text-muted-foreground mb-6 text-sm">All data in the Dashboard is displayed based on the Shipment assignment date.</div>
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
        <div className="space-y-4">
          <SimpleDataTable
            title="Orders Summary"
            columns={
              [
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
              ] as Column<any>[]
            }
            data={overview ? [overview] : []}
            isLoading={performance.isLoading}
          />
          {/* Middle Section with 3 cards */}
          <SimpleDataTable
            title="Top 10 Customers"
            columns={
              [
                { header: 'Customer Name', accessorKey: 'customerName' },
                { header: 'Total Shipments', accessorKey: 'totalShipments' },
                { header: 'Delivered', accessorKey: 'delivered' },
                { header: 'RTO', accessorKey: 'rto' },
                { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
                { header: 'Success Rate', accessorKey: 'successRate' },
                { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
                { header: 'Total Revenue', accessorKey: 'totalRevenue' },
                { header: 'Average Order Value', accessorKey: 'averageOrderValue' },
              ] as Column<any>[]
            }
            data={topCustomers}
            isLoading={performance.isLoading}
          />
          <SimpleDataTable
            title="Top 10 Products"
            columns={
              [
                { header: 'Weight Range', accessorKey: 'weightRange' },
                { header: 'Count', accessorKey: 'count' },
                { header: 'Percentage', accessorKey: 'percentage' },
                { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
                { header: 'Success Rate', accessorKey: 'successRate' },
              ] as Column<any>[]
            }
            data={topProducts}
            isLoading={performance.isLoading}
          />
          <SimpleDataTable
            title="Most Popular Orders Location"
            badge="Last 30 days"
            columns={
              [
                { header: 'Zone', accessorKey: 'zone' },
                { header: 'Total Shipments', accessorKey: 'totalShipments' },
                { header: 'Delivered', accessorKey: 'delivered' },
                { header: 'RTO', accessorKey: 'rto' },
                { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
                { header: 'Success Rate', accessorKey: 'successRate' },
                { header: 'Average Delivery Time', accessorKey: 'averageDeliveryTime' },
              ] as Column<any>[]
            }
            data={zonePerformance}
            isLoading={performance.isLoading}
          />
        </div>

        <div className="text-muted-foreground text-xs">Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.</div>
      </div>
    </div>
  );
}
