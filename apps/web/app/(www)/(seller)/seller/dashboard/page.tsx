'use client';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@lorrigo/ui/components';

import { Boxes, CircleHelp, Download, ExternalLink, MoreHorizontal, RefreshCw } from 'lucide-react';
import { ShipmentStatusChart } from './components/shipment-status-chart';
import { DeliveryPerformanceChart } from './components/delivery-performance-chart';
import { CourierSplitChart } from './components/courier-split-chart';
import { IndiaMap } from './components/india-map';
import { Header } from '@/components/header';
import { ShipmentOverviewTable } from './components/shipment-overview-table';
import { useOrdersAnalytics, useShipmentsAnalytics, useNdrAnalytics, useRtoAnalytics } from '@/lib/apis/analytics';
import type { OrdersAnalytics, ShipmentsAnalytics, NdrAnalytics, RtoAnalytics } from '@/lib/type/analytics';
// import { IndiaMap } from "@/components/india-map"

export default function SellerDashboardOverview() {
  const { data: ordersData, isLoading: ordersLoading } = useOrdersAnalytics();
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipmentsAnalytics();
  const { data: ndrData, isLoading: ndrLoading } = useNdrAnalytics();
  const { data: rtoData, isLoading: rtoLoading } = useRtoAnalytics();
  const orders: OrdersAnalytics = (ordersData as any) || {};
  const shipments: ShipmentsAnalytics = (shipmentsData as any) || {};
  const ndr: NdrAnalytics = (ndrData as any) || {};
  const rto: RtoAnalytics = (rtoData as any) || {};

  // Helper: get today's date in YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = Array.isArray(orders.summary) ? orders.summary.find((s: any) => s.date === today)?.totalOrders ?? 0 : 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yesterdayOrders = Array.isArray(orders.summary) ? orders.summary.find((s: any) => s.date === yesterday)?.totalOrders ?? 0 : 0;

  // Revenue: sum of today's orders
  const todayRevenue = 0; // If you have revenue in orders.summary, sum it here
  const yesterdayRevenue = 0; // Same for yesterday

  // Shipments summary
  const shipmentsTotal = Array.isArray(shipments.courierWise) ? shipments.courierWise.reduce((acc: number, c: any) => acc + Number(c.totalShipments || 0), 0) : 0;
  // You can add more aggregation for pending, inTransit, delivered, rto if available in API

  // NDR summary
  const ndrTotal = ndr.metrics?.raised || 0;
  const ndrReattempts = ndr.metrics?.actionRequired || 0;
  const ndrDelivered = ndr.metrics?.delivered || 0;

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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <div className="text-sm font-medium">{shipmentsTotal}</div>
                <div className="text-muted-foreground text-xs">Total Shipments</div>
              </div>
              {/* Add more shipment stats here if available in API */}
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
          data={Array.isArray(shipments.courierWise)
            ? shipments.courierWise.map((item) => ({
                name: item.courier,
                value: Number(item.totalShipments),
              }))
            : []}
          isLoading={shipmentsLoading}
        />
        <ShipmentStatusChart
          data={Array.isArray(shipments.shipmentStatus)
            ? shipments.shipmentStatus.map((item) => ({ name: item.name, value: item.value }))
            : []}
          isLoading={shipmentsLoading}
        />
        <DeliveryPerformanceChart
          data={Array.isArray(shipments.deliveryPerformance)
            ? shipments.deliveryPerformance.map((item) => ({ name: item.name, value: item.value }))
            : []}
          isLoading={shipmentsLoading}
        />
      </div>

      {/* Sixth row: Shipment Overview Table */}
      <ShipmentOverviewTable data={shipments.shipmentOverview || []} isLoading={shipmentsLoading} />
    </div>
  );
}
