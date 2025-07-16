'use client';
import { ChartCard } from '@/components/charts/chart-card';
import { PieChart } from '@/components/charts/pie-chart';
import { SimpleDataTable } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@lorrigo/ui/components';
import Link from 'next/link';
import { BarChart } from '@/components/charts/bar-chart';
import { MetricCard } from '@/components/charts/metric-card';
import { ComboChart } from '@/components/charts/combo-chart';
import { useShipmentAnalysis } from '@/lib/hooks/use-shipment-analysis';
import type { ShipmentPerformanceAnalytics } from '@/lib/type/shipment-analysis';

export default function NDRPage() {
  // Use the unified shipment analysis hook
  const { performance, isTokenReady } = useShipmentAnalysis();
  const analytics : any = performance.data || {};
  const isLoading = performance.isLoading;

  // Map NDR metrics
  const ndrMetrics = (analytics as any).topIssues || [];
  // Map other NDR-related analytics as needed

  // Example: NDR summary metrics (replace with real mapping as needed)
  const metrics = (analytics as any).ndrMetrics || {};
  const responseSummary = (analytics as any).ndrResponseSummary || {};
  const funnel = (analytics as any).ndrFunnel || {};
  const reasonSplit = (analytics as any).ndrReasonSplit || [];
  const statusSplit = (analytics as any).ndrStatusSplit || [];
  const responsesByAttempt = (analytics as any).ndrResponsesByAttempt || [];
  const ndrVsDeliveryAttempt = (analytics as any).ndrVsDeliveryAttempt || [];

  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">NDR</h1>
        <div className="text-muted-foreground mb-6 text-sm">
          The NDR dashboard is showing you the realtime data of last 30 days till today based on
          shipment assigned date.
        </div>
        {/* Date Range, Zone, Courier, Payment Mode, Shipment Mode Filters */}
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

        {/* NDR Summary */}
        <div className="mb-6">
          <ChartCard title="NDR Summary">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <MetricCard
                title="NDR Raised"
                value={metrics.raised}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="NDR Raised Percentage"
                value={metrics.percentage}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="Action Required"
                value={metrics.actionRequired}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="Delivered"
                value={metrics.delivered}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="Your RTO"
                value={metrics.rto}
                className="bg-gray-50 dark:bg-neutral-900"
              />
            </div>
          </ChartCard>
        </div>

        {/* NDR Response Summary and NDR Funnel */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ChartCard title="NDR Response Summary">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">{responseSummary.sellerResponse}</div>
                <div className="text-muted-foreground text-sm">Seller Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">{responseSummary.buyerResponse}</div>
                <div className="text-muted-foreground text-sm">Buyer Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {responseSummary.sellerPositiveResponse}
                </div>
                <div className="text-muted-foreground text-sm">Seller Positive Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {responseSummary.buyerPositiveResponse}
                </div>
                <div className="text-muted-foreground text-sm">Buyer Positive Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {responseSummary.sellerPositiveResponseDelivered}
                </div>
                <div className="text-muted-foreground text-sm">
                  Seller Positive Response Delivered
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {responseSummary.buyerPositiveResponseDelivered}
                </div>
                <div className="text-muted-foreground text-sm">
                  Buyer Positive Response Delivered
                </div>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="NDR Funnel">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border p-4">
                <div className="mb-2 text-center font-medium">1st NDR</div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.firstNDR?.total}</div>
                    <div className="text-muted-foreground text-center text-xs">Total Shipments</div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.firstNDR?.pending}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Pending Shipments
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.firstNDR?.delivered}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Delivered Shipments
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-4">
                <div className="mb-2 text-center font-medium">2nd NDR</div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-center justify-center rounded-md p-2 dark:bg-neutral-900">
                    <div className="text-sm font-medium">{funnel.secondNDR?.total}</div>
                    <div className="text-muted-foreground text-center text-xs">Total Shipments</div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.secondNDR?.pending}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Pending Shipments
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.secondNDR?.delivered}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Delivered Shipments
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-4">
                <div className="mb-2 text-center font-medium">3rd NDR</div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-center justify-center rounded-md p-2 dark:bg-neutral-900">
                    <div className="text-sm font-medium">{funnel.thirdNDR?.total}</div>
                    <div className="text-muted-foreground text-center text-xs">Total Shipments</div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.thirdNDR?.pending}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Pending Shipments
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{funnel.thirdNDR?.delivered}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Delivered Shipments
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* NDR Reason Split and Status Split */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ChartCard title="NDR Reason Split">
            <PieChart
              data={reasonSplit}
              // tooltipFormatter={(value) => [`${value}`, "NDRs"]}
              showLegend={true}
              legendPosition="bottom"
            />
          </ChartCard>

          <ChartCard title="NDR Status Split">
            <BarChart
              data={statusSplit}
              bars={[
                { dataKey: 'Delivered', color: '#4ade80' },
                { dataKey: 'RTO', color: '#818cf8' },
                { dataKey: 'Pending', color: '#fb923c' },
              ]}
              height={300}
            />
          </ChartCard>
        </div>

        {/* NDR Responses by Attempt */}
        <div className="mb-6">
          <SimpleDataTable
            title="NDR Responses by Attempt"
            columns={[
              { header: '', accessorKey: 'category' },
              { header: 'NDR Shipments', accessorKey: 'ndrShipments' },
              { header: '1st NDR Attempt', accessorKey: 'firstNDRAttempt' },
              { header: '1st NDR Delivered', accessorKey: 'firstNDRDelivered' },
              { header: '2nd NDR Attempt', accessorKey: 'secondNDRAttempt' },
              { header: '2nd NDR Delivered', accessorKey: 'secondNDRDelivered' },
              { header: '3rd NDR Attempt', accessorKey: 'thirdNDRAttempt' },
              { header: '3rd NDR Delivered', accessorKey: 'thirdNDRDelivered' },
              { header: 'Total Delivered', accessorKey: 'totalDelivered' },
              { header: 'Total RTO', accessorKey: 'totalRTO' },
              { header: 'Lost/ Damaged', accessorKey: 'lostDamaged' },
            ]}
            data={responsesByAttempt}
          />
        </div>

        {/* NDR vs Delivery Attempt, Seller Response, Buyer Response */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <ChartCard title="NDR vs Delivery Attempt">
            <ComboChart
              data={ndrVsDeliveryAttempt}
              bars={[{ dataKey: 'NDR Raised', color: '#818cf8' }]}
              lines={[{ dataKey: 'Delivery Attempt', color: '#facc15' }]}
              height={300}
            />
          </ChartCard>

          <ChartCard title="Seller Response">
            <BarChart
              data={analytics.sellerResponse}
              bars={[
                { dataKey: 'NDR', color: '#facc15' },
                { dataKey: 'Seller Response', color: '#818cf8' },
              ]}
              height={300}
            />
          </ChartCard>

          <ChartCard title="Buyer Response">
            <BarChart
              data={analytics.buyerResponse}
              bars={[
                { dataKey: 'NDR', color: '#facc15' },
                { dataKey: 'Buyer Response', color: '#fb923c' },
              ]}
              height={300}
            />
          </ChartCard>
        </div>

        {/* Success by Courier */}
        <div className="mb-6">
          <SimpleDataTable
            title="Success by Courier"
            columns={[
              { header: '', accessorKey: 'name' },
              { header: 'Total', accessorKey: 'total' },
              { header: 'Zone A', accessorKey: 'zoneA' },
              { header: 'Zone B', accessorKey: 'zoneB' },
              { header: 'Zone C', accessorKey: 'zoneC' },
              { header: 'Zone D', accessorKey: 'zoneD' },
              { header: 'Zone E', accessorKey: 'zoneE' },
            ]}
            data={analytics.successByCourier}
          />
        </div>

        {/* NDR Reason */}
        <div className="mb-6">
          <SimpleDataTable
            title="NDR Reason"
            columns={[
              { header: '', accessorKey: 'reason' },
              { header: 'Total', accessorKey: 'total' },
              { header: 'Pending', accessorKey: 'pending' },
              { header: 'Delivered', accessorKey: 'delivered' },
              { header: 'RTO', accessorKey: 'rto' },
              { header: 'Lost/ Damaged', accessorKey: 'lostDamaged' },
            ]}
            data={analytics.ndrReason}
          />
        </div>

        <div className="text-muted-foreground text-xs">
          Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
        </div>
      </div>
    </div>
  );
}
