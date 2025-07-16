'use client';
import { ChartCard } from '@/components/charts/chart-card';
import { PieChart } from '@/components/charts/pie-chart';
import { SimpleDataTable } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { Button } from '@lorrigo/ui/components';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@lorrigo/ui/components';
import Link from 'next/link';
import { useOrdersAnalytics } from '@/lib/apis/analytics';

export default function OrdersPage() {
  const { data, isLoading, error } = useOrdersAnalytics();
  const analytics = data?.data || {};

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
              {
                header: 'Date',
                accessorKey: 'date',
                // cell: (value) => {
                //    const date = new Date(value)
                //    return date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
                // },
              },
              { header: 'Total Orders', accessorKey: 'totalOrders' },
              { header: 'Pickup Unscheduled', accessorKey: 'pickupUnscheduled' },
              { header: 'Pickup Scheduled', accessorKey: 'pickupScheduled' },
              { header: 'In Transit', accessorKey: 'inTransit' },
              { header: 'Delivered', accessorKey: 'delivered' },
              { header: 'Undelivered', accessorKey: 'undelivered' },
              { header: 'RTO', accessorKey: 'rto' },
              { header: 'Lost/Damaged', accessorKey: 'lostDamaged' },
              { header: 'Cancelled', accessorKey: 'cancelled' },
            ]}
            data={analytics.ordersSummary || []}
            isLoading={isLoading}
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
              data={analytics.paymentType || []}
              // tooltipFormatter={(value) => [`${value}`, "Orders"]}
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
              { header: 'States', accessorKey: 'state' },
              { header: 'Order Count', accessorKey: 'orderCount' },
              { header: 'Revenue', accessorKey: 'revenue' },
              { header: 'Revenue %', accessorKey: 'revenuePercentage' },
            ]}
            data={analytics.popularLocations || []}
            isLoading={isLoading}
          />
        </div>

        {/* Bottom Section with 2 cards */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <SimpleDataTable
            title="Top 10 Customers"
            columns={[
              { header: 'Customer Name', accessorKey: 'customerName' },
              { header: 'Order Count', accessorKey: 'orderCount' },
              { header: 'Revenue', accessorKey: 'revenue' },
            ]}
            data={analytics.topCustomers || []}
            isLoading={isLoading}
          />

          <SimpleDataTable
            title="Top 10 Products"
            columns={[
              { header: 'Product Name', accessorKey: 'productName' },
              { header: 'Unit Sold', accessorKey: 'unitSold' },
              { header: 'Revenue', accessorKey: 'revenue' },
            ]}
            data={analytics.topProducts || []}
            isLoading={isLoading}
          />
        </div>

        <div className="text-muted-foreground text-xs">
          Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
        </div>
      </div>
    </div>
  );
}
