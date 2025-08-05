'use client';
import { ChartCard } from '@/components/charts/chart-card';
import { PieChart } from '@/components/charts/pie-chart';
import { SimpleDataTable } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@lorrigo/ui/components';
import Link from 'next/link';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { MetricCard } from '@/components/charts/metric-card';
import { useShipmentAnalysis } from '@/lib/hooks/use-shipment-analysis';
import { RtoAnalytics } from '@/lib/type/analytics';
import type { ShipmentPerformanceAnalytics } from '@/lib/type/shipment-analysis';

export default function RTOPage() {
  // Use the unified shipment analysis hook
  const { performance, isTokenReady } = useShipmentAnalysis();
  const analytics: ShipmentPerformanceAnalytics | {} = performance.data || {};
  const isLoading = performance.isLoading;

  // Map RTO metrics
  const rtoMetrics = (analytics as any).rtoMetrics || {};
  const countOverTime = (analytics as any).rtoCountOverTime || [];
  const status = (analytics as any).rtoStatus || [];
  const reasons = (analytics as any).rtoReasons || [];
  const topByPincode = (analytics as any).rtoTopByPincode || [];
  const topByCity = (analytics as any).rtoTopByCity || [];
  const topByCourier = (analytics as any).rtoTopByCourier || [];
  const topByCustomer = (analytics as any).rtoTopByCustomer || [];

  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">RTO</h1>
        <div className="text-muted-foreground mb-6 text-sm">All data in the Dashboard is displayed based on the Shipment assignment date.</div>

        {/* Filter Section */}
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

        {/* RTO Overview */}
        <div className="mb-6">
          <ChartCard title="RTO Overview">
            {/* <div className="mb-4 rounded-md bg-purple-900 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Protect Your COD Orders from Address Risk</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">Powered by Risk AI</Badge>
                  <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                    Activate Now
                  </Button>
                </div>
              </div>
            </div> */}
            <div className="grid grid-cols-5 gap-4">
              <MetricCard title="Total RTO" value={rtoMetrics.total} className="bg-gray-50 dark:bg-neutral-900" />
              <MetricCard title="RTO Percentage" value={rtoMetrics.percentage} className="bg-gray-50 dark:bg-neutral-900" />
              <MetricCard title="RTO Initiated" value={rtoMetrics.initiated} className="bg-gray-50 dark:bg-neutral-900" />
              <MetricCard title="RTO Undelivered" value={rtoMetrics.undelivered} className="bg-gray-50 dark:bg-neutral-900" />
              <MetricCard title="RTO Delivered" value={rtoMetrics.delivered} className="bg-gray-50 dark:bg-neutral-900" />
            </div>
          </ChartCard>
        </div>

        {/* RTO Count Chart */}
        <div className="mb-6">
          <ChartCard title="RTO Count">
            <LineChart data={countOverTime} lines={[{ dataKey: 'RTO Count', color: '#818cf8' }]} height={300} />
          </ChartCard>
        </div>

        {/* RTO Status and Reasons */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ChartCard title="RTO Status">
            <BarChart
              data={status}
              bars={[
                { dataKey: 'rtoInitiated', color: '#818cf8' },
                { dataKey: 'rtoDelivered', color: '#4ade80' },
                { dataKey: 'rtoUndelivered', color: '#f87171' },
              ]}
              height={300}
            />
          </ChartCard>

          <ChartCard title="RTO Reasons">
            <PieChart
              data={reasons}
              // tooltipFormatter={(value) => [`${value}`, "RTOs"]}
              showLegend={true}
              legendPosition="bottom"
            />
          </ChartCard>
        </div>

        {/* Top RTO by Pincode and City */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <SimpleDataTable
            title="Top RTO - Pincodes"
            badge="Last 30 days"
            columns={[
              { header: 'Pincode', accessorKey: 'pincode' },
              { header: 'RTO Count', accessorKey: 'rtoCount' },
              { header: 'Percentage', accessorKey: 'percentage' },
            ]}
            data={topByPincode}
          />

          <SimpleDataTable
            title="Top RTO - City"
            badge="Last 30 days"
            columns={[
              { header: 'City', accessorKey: 'city' },
              { header: 'RTO Count', accessorKey: 'rtoCount' },
              { header: 'Percentage', accessorKey: 'percentage' },
            ]}
            data={topByCity}
          />
        </div>

        {/* Top RTO by Courier and Customer */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <SimpleDataTable
            title="Top RTO - Courier"
            badge="Last 30 days"
            columns={[
              { header: 'Name', accessorKey: 'name' },
              { header: 'RTO Count', accessorKey: 'rtoCount' },
              { header: 'Percentage', accessorKey: 'percentage' },
            ]}
            data={topByCourier}
          />

          <SimpleDataTable
            title="Top RTO - Customer"
            badge="Last 30 days"
            columns={[
              { header: 'Name', accessorKey: 'name' },
              { header: 'RTO Count', accessorKey: 'rtoCount' },
              { header: 'Percentage', accessorKey: 'percentage' },
            ]}
            data={topByCustomer}
          />
        </div>

        <div className="text-muted-foreground text-xs">Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.</div>
      </div>
    </div>
  );
}
