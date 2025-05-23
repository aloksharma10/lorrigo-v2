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

// Sample data for NDR metrics
const ndrMetricsData = {
  raised: '5.8K',
  percentage: '34.33%',
  actionRequired: '3.8K',
  delivered: '1.6K',
  rto: '2.8K',
};

// Sample data for NDR response summary
const ndrResponseSummaryData = {
  sellerResponse: 49,
  buyerResponse: 2,
  sellerPositiveResponse: 37,
  buyerPositiveResponse: 2,
  sellerPositiveResponseDelivered: 14,
  buyerPositiveResponseDelivered: 2,
};

// Sample data for NDR funnel
const ndrFunnelData = {
  firstNDR: {
    total: '5.8K',
    pending: 634,
    delivered: '1.3K',
  },
  secondNDR: {
    total: '2.3K',
    pending: 367,
    delivered: 203,
  },
  thirdNDR: {
    total: '1.3K',
    pending: 367,
    delivered: 82,
  },
};

// Sample data for NDR reason split
const ndrReasonSplitData = [
  { name: 'Customer Not Available', value: 2500, percentage: '43%' },
  { name: 'Address Not Found', value: 1200, percentage: '21%' },
  { name: 'Customer Refused', value: 800, percentage: '14%' },
  { name: 'Payment Issues', value: 700, percentage: '12%' },
  { name: 'Other', value: 600, percentage: '10%' },
];

// Sample data for NDR status split
const ndrStatusSplitData = [
  { name: '22 Apr-28 Apr', Delivered: 500, RTO: 100, Pending: 400 },
  { name: '29 Apr-05 May', Delivered: 700, RTO: 150, Pending: 650 },
  { name: '06 May-12 May', Delivered: 400, RTO: 120, Pending: 300 },
  { name: '13 May-19 May', Delivered: 300, RTO: 80, Pending: 200 },
  { name: '20 May-21 May', Delivered: 200, RTO: 50, Pending: 100 },
];

// Sample data for NDR responses by attempt
const ndrResponsesByAttemptData = [
  {
    category: 'Total NDR Raised',
    ndrShipments: 5833,
    firstNDRAttempt: 5179,
    firstNDRDelivered: 1309,
    secondNDRAttempt: 1905,
    secondNDRDelivered: 203,
    thirdNDRAttempt: 574,
    thirdNDRDelivered: 82,
    totalDelivered: 1624,
    totalRTO: 2201,
    lostDamaged: 0,
  },
  {
    category: 'Seller Response',
    ndrShipments: 49,
    firstNDRAttempt: 45,
    firstNDRDelivered: 8,
    secondNDRAttempt: 26,
    secondNDRDelivered: 7,
    thirdNDRAttempt: 14,
    thirdNDRDelivered: 3,
    totalDelivered: 14,
    totalRTO: 26,
    lostDamaged: 0,
  },
  {
    category: 'Seller Positive Response',
    ndrShipments: 37,
    firstNDRAttempt: 34,
    firstNDRDelivered: 6,
    secondNDRAttempt: 24,
    secondNDRDelivered: 7,
    thirdNDRAttempt: 10,
    thirdNDRDelivered: 3,
    totalDelivered: 14,
    totalRTO: 15,
    lostDamaged: 0,
  },
  {
    category: 'Buyer Response',
    ndrShipments: 2,
    firstNDRAttempt: 2,
    firstNDRDelivered: 0,
    secondNDRAttempt: 2,
    secondNDRDelivered: 0,
    thirdNDRAttempt: 2,
    thirdNDRDelivered: 2,
    totalDelivered: 0,
    totalRTO: 0,
    lostDamaged: 0,
  },
  {
    category: 'Buyer Positive Response',
    ndrShipments: 2,
    firstNDRAttempt: 2,
    firstNDRDelivered: 0,
    secondNDRAttempt: 2,
    secondNDRDelivered: 0,
    thirdNDRAttempt: 2,
    thirdNDRDelivered: 2,
    totalDelivered: 0,
    totalRTO: 0,
    lostDamaged: 0,
  },
];

// Sample data for NDR vs Delivery Attempt
const ndrVsDeliveryAttemptData = [
  { name: '22 Apr-28 Apr', 'NDR Raised': 1200, 'Delivery Attempt': 1500 },
  { name: '29 Apr-05 May', 'NDR Raised': 1800, 'Delivery Attempt': 2000 },
  { name: '05 May-12 May', 'NDR Raised': 1400, 'Delivery Attempt': 1600 },
  { name: '13 May-19 May', 'NDR Raised': 1100, 'Delivery Attempt': 1300 },
  { name: '20 May-21 May', 'NDR Raised': 800, 'Delivery Attempt': 900 },
];

// Sample data for Seller Response
const sellerResponseData = [
  { name: '22 Apr-28 Apr', NDR: 1200, 'Seller Response': 100 },
  { name: '29 Apr-05 May', NDR: 1800, 'Seller Response': 150 },
  { name: '06 May-12 May', NDR: 1400, 'Seller Response': 120 },
  { name: '13 May-19 May', NDR: 1100, 'Seller Response': 90 },
  { name: '20 May-21 May', NDR: 800, 'Seller Response': 70 },
];

// Sample data for Buyer Response
const buyerResponseData = [
  { name: '22 Apr-28 Apr', NDR: 1200, 'Buyer Response': 50 },
  { name: '29 Apr-05 May', NDR: 1800, 'Buyer Response': 80 },
  { name: '06 May-12 May', NDR: 1400, 'Buyer Response': 60 },
  { name: '13 May-19 May', NDR: 1100, 'Buyer Response': 40 },
  { name: '20 May-21 May', NDR: 800, 'Buyer Response': 30 },
];

// Sample data for Success by Courier
const successByCourierData = [
  {
    name: 'NDR Raised',
    total: 19934,
    zoneA: 745,
    zoneB: 1361,
    zoneC: 1560,
    zoneD: 12118,
    zoneE: 1150,
  },
  {
    name: 'NDR Delivered',
    total: 9507,
    zoneA: 355,
    zoneB: 731,
    zoneC: 810,
    zoneD: 6214,
    zoneE: 460,
  },
];

// Sample data for NDR Reason
const ndrReasonData = [
  {
    reason: 'Customer Not Found / Not Available',
    total: 2115,
    pending: 364,
    delivered: 12,
    rto: 1743,
    lostDamaged: 0,
  },
  {
    reason: 'Customer Not Available',
    total: 1230,
    pending: 175,
    delivered: 445,
    rto: 607,
    lostDamaged: 0,
  },
  {
    reason: 'Wrong Address',
    total: 629,
    pending: 311,
    delivered: 236,
    rto: 284,
    lostDamaged: 0,
  },
  {
    reason: 'Payment/Delivery/PIN/OTP Invalid',
    total: 627,
    pending: 80,
    delivered: 577,
    rto: 10,
    lostDamaged: 0,
  },
  {
    reason: 'Customer Refused',
    total: 291,
    pending: 50,
    delivered: 3,
    rto: 200,
    lostDamaged: 0,
  },
];

export default function NDRPage() {
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
                value={ndrMetricsData.raised}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="NDR Raised Percentage"
                value={ndrMetricsData.percentage}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="Action Required"
                value={ndrMetricsData.actionRequired}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="Delivered"
                value={ndrMetricsData.delivered}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="Your RTO"
                value={ndrMetricsData.rto}
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
                <div className="text-2xl font-bold">{ndrResponseSummaryData.sellerResponse}</div>
                <div className="text-muted-foreground text-sm">Seller Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">{ndrResponseSummaryData.buyerResponse}</div>
                <div className="text-muted-foreground text-sm">Buyer Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {ndrResponseSummaryData.sellerPositiveResponse}
                </div>
                <div className="text-muted-foreground text-sm">Seller Positive Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {ndrResponseSummaryData.buyerPositiveResponse}
                </div>
                <div className="text-muted-foreground text-sm">Buyer Positive Response</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {ndrResponseSummaryData.sellerPositiveResponseDelivered}
                </div>
                <div className="text-muted-foreground text-sm">
                  Seller Positive Response Delivered
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-4">
                <div className="text-2xl font-bold">
                  {ndrResponseSummaryData.buyerPositiveResponseDelivered}
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
                    <div className="text-sm font-medium">{ndrFunnelData.firstNDR.total}</div>
                    <div className="text-muted-foreground text-center text-xs">Total Shipments</div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{ndrFunnelData.firstNDR.pending}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Pending Shipments
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{ndrFunnelData.firstNDR.delivered}</div>
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
                    <div className="text-sm font-medium">{ndrFunnelData.secondNDR.total}</div>
                    <div className="text-muted-foreground text-center text-xs">Total Shipments</div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{ndrFunnelData.secondNDR.pending}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Pending Shipments
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{ndrFunnelData.secondNDR.delivered}</div>
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
                    <div className="text-sm font-medium">{ndrFunnelData.thirdNDR.total}</div>
                    <div className="text-muted-foreground text-center text-xs">Total Shipments</div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{ndrFunnelData.thirdNDR.pending}</div>
                    <div className="text-muted-foreground text-center text-xs">
                      Pending Shipments
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-md p-2">
                    <div className="text-sm font-medium">{ndrFunnelData.thirdNDR.delivered}</div>
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
              data={ndrReasonSplitData}
              // tooltipFormatter={(value) => [`${value}`, "NDRs"]}
              showLegend={true}
              legendPosition="bottom"
            />
          </ChartCard>

          <ChartCard title="NDR Status Split">
            <BarChart
              data={ndrStatusSplitData}
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
            data={ndrResponsesByAttemptData}
          />
        </div>

        {/* NDR vs Delivery Attempt, Seller Response, Buyer Response */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <ChartCard title="NDR vs Delivery Attempt">
            <ComboChart
              data={ndrVsDeliveryAttemptData}
              bars={[{ dataKey: 'NDR Raised', color: '#818cf8' }]}
              lines={[{ dataKey: 'Delivery Attempt', color: '#facc15' }]}
              height={300}
            />
          </ChartCard>

          <ChartCard title="Seller Response">
            <BarChart
              data={sellerResponseData}
              bars={[
                { dataKey: 'NDR', color: '#facc15' },
                { dataKey: 'Seller Response', color: '#818cf8' },
              ]}
              height={300}
            />
          </ChartCard>

          <ChartCard title="Buyer Response">
            <BarChart
              data={buyerResponseData}
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
            data={successByCourierData}
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
            data={ndrReasonData}
          />
        </div>

        <div className="text-muted-foreground text-xs">
          Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
        </div>
      </div>
    </div>
  );
}
