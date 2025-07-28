'use client';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@lorrigo/ui/components';

import { Boxes, CircleHelp, Download, ExternalLink, MoreHorizontal, RefreshCw } from 'lucide-react';
import { ShipmentStatusChart } from './components/shipment-status-chart';
import { DeliveryPerformanceChart } from './components/delivery-performance-chart';
import { CourierSplitChart } from './components/courier-split-chart';
import { IndiaMap } from './components/india-map';
import { Header } from '@/components/header';
import { ShipmentOverviewTable } from './components/shipment-overview-table';
import { useShipmentAnalysis } from '@/lib/hooks/use-shipment-analysis';

export default function SellerDashboardOverview() {
  const { home, performance, realtime, predictive, isTokenReady } = useShipmentAnalysis();

  // Extract summary data
  const summary = home.data?.summary || [];
  const shipmentsOverview: Partial<{ totalShipments: number }> = performance.data?.overview || {};
  const ndrMetrics = performance.data?.topIssues || [];
  // Add more mappings as needed for your UI

  // Example: Today's and yesterday's orders from summary
  const todayOrders = summary.find((s) => s.title === 'Orders Today')?.value || 0;
  const yesterdayOrders = summary.find((s) => s.title === 'Orders Today')?.trend?.percentage || 0;
  const todayRevenue = summary.find((s) => s.title === 'Revenue Today')?.value || 0;
  const yesterdayRevenue = summary.find((s) => s.title === 'Revenue Today')?.trend?.percentage || 0;

  // Example: Shipments total from overview
  const shipmentsTotal = (shipmentsOverview && typeof shipmentsOverview.totalShipments === 'number') ? shipmentsOverview.totalShipments : 0;

  // Example: NDR summary (replace with real mapping as needed)
  const ndrTotal = ndrMetrics.length;
  const ndrReattempts = 0; // Map from real API if available
  const ndrDelivered = 0; // Map from real API if available

  // Shipments Details
  const shipmentOverview = performance.data?.overview;
  // Overall Shipment Status
  const statusDistribution = performance.data?.statusDistribution || [];
  // Delivery Performance
  const deliveryTimeline = performance.data?.deliveryTimeline || [];
  // Only declare courierPerformance once at the top
  const courierPerformance = performance.data?.courierPerformance || [];

  // Map for ShipmentStatusChart
  const shipmentStatusChartData = statusDistribution.map((item) => ({
    name: item.status,
    value: item.count,
  }));

  // Map for DeliveryPerformanceChart
  const deliveryPerformanceChartData = deliveryTimeline.map((item) => ({
    name: item.date,
    value: item.delivered,
  }));

  // Map for ShipmentOverviewTable
  const shipmentOverviewTableData = (performance.data?.courierPerformance || []).map((item) => ({
    courierName: item.courierName,
    pickupUnscheduled: 0, // Not available in API, set to 0
    pickupScheduled: 0, // Not available in API, set to 0
    inTransit: 0, // Not available in API, set to 0
    delivered: item.delivered,
    rto: item.rto,
    lostDamaged: item.lostDamaged,
    totalShipment: item.totalShipments,
  }));

  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">Domestic</Badge>
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      {/* First row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <Boxes className="text-indigo-500 h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{todayOrders}</div>
                <div className="text-muted-foreground text-xs">
                  Yesterday: <span className="font-medium">{yesterdayOrders}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <Boxes className="text-green-500 h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">₹{todayRevenue}</div>
                <div className="text-muted-foreground text-xs">
                  Yesterday: <span className="font-medium">₹{yesterdayRevenue}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Second row: Shipments and NDR summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Shipments Details</CardTitle>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.totalShipments ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Total Shipments</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.delivered ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Delivered</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.inTransit ?? '-'}</div>
                <div className="text-muted-foreground text-xs">In Transit</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.pending ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Pending</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.rto ?? '-'}</div>
                <div className="text-muted-foreground text-xs">RTO</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.lostDamaged ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Lost/Damaged</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.onTimeDelivery ?? '-'}</div>
                <div className="text-muted-foreground text-xs">On Time Delivery</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.delayedDelivery ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Delayed Delivery</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.averageDeliveryTime ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Avg Delivery Time</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{shipmentOverview?.successRate ?? '-'}</div>
                <div className="text-muted-foreground text-xs">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">NDR Details</CardTitle>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{ndrTotal}</div>
                <div className="text-muted-foreground text-xs">Total NDR</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{ndrReattempts}</div>
                <div className="text-muted-foreground text-xs">Your Reattempt Request</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">-</div>
                <div className="text-muted-foreground text-xs">Buyer Reattempt Request</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">{ndrDelivered}</div>
                <div className="text-muted-foreground text-xs">NDR Delivered</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Fourth row: Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <CourierSplitChart
          data={courierPerformance.map((item) => ({
            name: item.courierName,
            value: Number(item.totalShipments),
          }))}
          isLoading={performance.isLoading}
        />
        <ShipmentStatusChart
          data={shipmentStatusChartData}
          isLoading={performance.isLoading}
        />
        <DeliveryPerformanceChart
          data={deliveryPerformanceChartData}
          isLoading={performance.isLoading}
        />
      </div>
      {/* Sixth row: Shipment Overview Table */}
      <ShipmentOverviewTable data={shipmentOverviewTableData} isLoading={performance.isLoading} />
    </div>
  );
}
