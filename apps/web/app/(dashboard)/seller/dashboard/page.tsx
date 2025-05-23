import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@lorrigo/ui/components';

import { Boxes, CircleHelp, Download, ExternalLink, MoreHorizontal, RefreshCw } from 'lucide-react';
import { ShipmentStatusChart } from './components/shipment-status-chart';
import { DeliveryPerformanceChart } from './components/delivery-performance-chart';
import { CourierSplitChart } from './components/courier-split-chart';
import { IndiaMap } from './components/india-map';
import { Header } from '@/components/header';
import { ShipmentOverviewTable } from './components/shipment-overview-table';
// import { IndiaMap } from "@/components/india-map"

export default function SellerDashboardOverview() {
  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Domestic
          </Badge>
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {/* <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button> */}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-indigo-500"
                >
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                  <line x1="9" y1="9" x2="10" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-bold">0</div>
                <div className="text-muted-foreground text-xs">
                  Yesterday: <span className="font-medium">587</span>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                  <line x1="9" y1="9" x2="10" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-bold">₹0</div>
                <div className="text-muted-foreground text-xs">
                  Yesterday: <span className="font-medium">₹13,28,355</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
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
                <div className="text-sm font-medium">16.4K</div>
                <div className="text-muted-foreground text-xs">Total Shipments</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">541</div>
                <div className="text-muted-foreground text-xs">Pickup Pending</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">2.2K</div>
                <div className="text-muted-foreground text-xs">In-Transit</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">9.3K</div>
                <div className="text-muted-foreground text-xs">Delivered</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">2.9K</div>
                <div className="text-muted-foreground text-xs">RTO</div>
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
                <div className="text-sm font-medium">5.9K</div>
                <div className="text-muted-foreground text-xs">Total NDR</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">49</div>
                <div className="text-muted-foreground text-xs">Your Reattmpt Request</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">2</div>
                <div className="text-muted-foreground text-xs">Buyer Reattmpt Request</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">1.6K</div>
                <div className="text-muted-foreground text-xs">NDR Delivered</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Average Shipping Cost</CardTitle>
              <Badge variant="outline" className="text-xs">
                Last 30 days
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-indigo-500"
                >
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                  <line x1="9" y1="9" x2="10" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-bold">₹62</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">COD Status</CardTitle>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">₹54.4L</div>
                <div className="text-muted-foreground text-xs">Total COD (Last 30 Days)</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">₹0</div>
                <div className="text-muted-foreground text-xs">COD Available</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">₹0</div>
                <div className="text-muted-foreground text-xs">
                  COD Pending (Greater than 5 days)
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-md border p-3">
                <div className="text-sm font-medium">₹1.8L</div>
                <div className="text-muted-foreground text-xs">Last COD Remitted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fourth row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <CourierSplitChart />
        <ShipmentStatusChart />
        <DeliveryPerformanceChart />
      </div>

      {/* Fifth row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <Badge variant="outline" className="text-xs">
                Last 30 days
              </Badge>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <IndiaMap />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Shipments - Zone Distribution</CardTitle>
              <Badge variant="outline" className="text-xs">
                Last 30 days
              </Badge>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm">Zone A</span>
                </div>
                <span className="text-sm">791 (4.7%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">Zone B</span>
                </div>
                <span className="text-sm">1,349 (8.2%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-sm">Zone C</span>
                </div>
                <span className="text-sm">1,552 (9.2%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-800"></div>
                  <span className="text-sm">Zone D</span>
                </div>
                <span className="text-sm">11,717 (71.5%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Zone E</span>
                </div>
                <span className="text-sm">1,054 (6.7%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <Badge variant="outline" className="text-xs">
                Last 30 days
              </Badge>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Last 30 Days</span>
                <span className="text-sm font-medium">₹3,28,45,953</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">This Week</span>
                <span className="text-sm font-medium">₹29,35,596</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">This Month</span>
                <span className="text-sm font-medium">₹1,56,78,822</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">This Quarter</span>
                <span className="text-sm font-medium">₹2,83,15,903</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sixth row */}
      <ShipmentOverviewTable />
    </div>
  );
}
