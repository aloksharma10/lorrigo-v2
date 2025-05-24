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

// Sample data for RTO metrics
const rtoMetricsData = {
  total: 2821,
  percentage: '16.7%',
  initiated: 548,
  undelivered: 3,
  delivered: 2270,
};

// Sample data for RTO count over time
const rtoCountData = [
  { name: '22 Apr-28 Apr', 'RTO Count': 750 },
  { name: '29 Apr-05 May', 'RTO Count': 1250 },
  { name: '06 May-12 May', 'RTO Count': 600 },
  { name: '13 May-19 May', 'RTO Count': 250 },
  { name: '20 May-21 May', 'RTO Count': 100 },
];

// Sample data for RTO status
const rtoStatusData = [
  { name: '22 Apr-28 Apr', 'RTO Initiated': 150, 'RTO Delivered': 750, 'RTO Undelivered': 0 },
  { name: '29 Apr-05 May', 'RTO Initiated': 200, 'RTO Delivered': 1050, 'RTO Undelivered': 0 },
  { name: '06 May-12 May', 'RTO Initiated': 250, 'RTO Delivered': 350, 'RTO Undelivered': 0 },
  { name: '13 May-19 May', 'RTO Initiated': 100, 'RTO Delivered': 150, 'RTO Undelivered': 0 },
  { name: '20 May-21 May', 'RTO Initiated': 0, 'RTO Delivered': 100, 'RTO Undelivered': 0 },
];

// Sample data for RTO reasons
const rtoReasonsData = [
  { name: 'Customer Refused', value: 1200, percentage: '42%' },
  { name: 'Address Not Found', value: 800, percentage: '28%' },
  { name: 'Customer Not Available', value: 500, percentage: '18%' },
  { name: 'Payment Issues', value: 200, percentage: '7%' },
  { name: 'Other', value: 121, percentage: '5%' },
];

// Sample data for top RTO by pincode
const topRTOByPincodeData = [
  { pincode: '121101', rtoCount: 1, percentage: '50.0%' },
  { pincode: '335707', rtoCount: 1, percentage: '100.0%' },
  { pincode: '396511', rtoCount: 1, percentage: '100.0%' },
  { pincode: '401601', rtoCount: 1, percentage: '100.0%' },
  { pincode: '442401', rtoCount: 1, percentage: '100.0%' },
  { pincode: '756001', rtoCount: 1, percentage: '100.0%' },
];

// Sample data for top RTO by city
const topRTOByCityData = [
  { city: 'Gurugram', rtoCount: 2, percentage: '22.2%' },
  { city: 'Kolkata', rtoCount: 1, percentage: '20.0%' },
  { city: 'Kanpur Nagar', rtoCount: 1, percentage: '25.0%' },
  { city: 'Guwahati', rtoCount: 1, percentage: '50.0%' },
  { city: 'Siliguri', rtoCount: 1, percentage: '100.0%' },
  { city: 'Aligarh', rtoCount: 1, percentage: '100.0%' },
];

// Sample data for top RTO by courier
const topRTOByCourierData = [
  { name: 'Bluedart Surface 500 g Surface", rtoCount: 2,836, percentage: "19.2%' },
  { name: 'Bluedart Surface 2Kg_5Kg', rtoCount: 4, percentage: '1.0%' },
  { name: 'Xpressbees Surface', rtoCount: 3, percentage: '40.0%' },
  { name: 'Blue Dart Air', rtoCount: 2, percentage: '1.8%' },
  { name: 'Delivery Air', rtoCount: 1, percentage: '3.4%' },
];

// Sample data for top RTO by customer
const topRTOByCustomerData = [
  { name: 'Sumitomo', rtoCount: 15, percentage: '22.2%' },
  { name: 'Mr Ayush', rtoCount: 3, percentage: '60.0%' },
  { name: 'Manu Arora', rtoCount: 2, percentage: '40.0%' },
  { name: 'Chandrakant Patkar', rtoCount: 1, percentage: '100.0%' },
  { name: 'Lalbaugcha', rtoCount: 1, percentage: '100.0%' },
  { name: 'Yogesh Maid', rtoCount: 1, percentage: '100.0%' },
];

export default function RTOPage() {
  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">RTO</h1>
        <div className="text-muted-foreground mb-6 text-sm">
          All data in the Dashboard is displayed based on the Shipment assignment date.
        </div>

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
            <div className="mb-4 rounded-md bg-purple-900 p-4 text-white">
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
            </div>
            <div className="grid grid-cols-5 gap-4">
              <MetricCard
                title="Total RTO"
                value={rtoMetricsData.total}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="RTO Percentage"
                value={rtoMetricsData.percentage}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="RTO Initiated"
                value={rtoMetricsData.initiated}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="RTO Undelivered"
                value={rtoMetricsData.undelivered}
                className="bg-gray-50 dark:bg-neutral-900"
              />
              <MetricCard
                title="RTO Delivered"
                value={rtoMetricsData.delivered}
                className="bg-gray-50 dark:bg-neutral-900"
              />
            </div>
          </ChartCard>
        </div>

        {/* RTO Count Chart */}
        <div className="mb-6">
          <ChartCard title="RTO Count">
            <LineChart
              data={rtoCountData}
              lines={[{ dataKey: 'RTO Count', color: '#818cf8' }]}
              height={300}
            />
          </ChartCard>
        </div>

        {/* RTO Status and Reasons */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ChartCard title="RTO Status">
            <BarChart
              data={rtoStatusData}
              bars={[
                { dataKey: 'RTO Initiated', color: '#818cf8' },
                { dataKey: 'RTO Delivered', color: '#4ade80' },
                { dataKey: 'RTO Undelivered', color: '#f87171' },
              ]}
              height={300}
            />
          </ChartCard>

          <ChartCard title="RTO Reasons">
            <PieChart
              data={rtoReasonsData}
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
            data={topRTOByPincodeData}
          />

          <SimpleDataTable
            title="Top RTO - City"
            badge="Last 30 days"
            columns={[
              { header: 'City', accessorKey: 'city' },
              { header: 'RTO Count', accessorKey: 'rtoCount' },
              { header: 'Percentage', accessorKey: 'percentage' },
            ]}
            data={topRTOByCityData}
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
            data={topRTOByCourierData}
          />

          <SimpleDataTable
            title="Top RTO - Customer"
            badge="Last 30 days"
            columns={[
              { header: 'Name', accessorKey: 'name' },
              { header: 'RTO Count', accessorKey: 'rtoCount' },
              { header: 'Percentage', accessorKey: 'percentage' },
            ]}
            data={topRTOByCustomerData}
          />
        </div>

        <div className="text-muted-foreground text-xs">
          Note: Last updated on 21 May 2025. There might be a slight mismatch in the data.
        </div>
      </div>
    </div>
  );
}
