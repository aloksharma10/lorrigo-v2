'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  X,
  MapPin,
  Package,
  CreditCard,
  Weight,
  AlertTriangle,
  Clock,
  Calendar,
  Truck,
  Info,
} from 'lucide-react';
import {
  toast,
  Button,
  Separator,
  Alert,
  AlertDescription,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@lorrigo/ui/components';
import { CourierLogo } from '@/components/courier-logo';
import { RatingBadge } from '@/components/rating-badge';
import { useShippingOperations, type CourierRate } from '@/lib/apis/shipment';
import { currencyFormatter } from '@lorrigo/utils';

export default function ShipOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState('custom');
  const [isShipping, setIsShipping] = useState<string | null>(null);

  const { getShippingRates, shipOrder } = useShippingOperations();
  const { data, isLoading, error } = getShippingRates(orderId);

  const handleShipOrder = async (carrierId: string, courierName: string) => {
    setIsShipping(carrierId);
    try {
      await shipOrder.mutateAsync({ orderId, carrierId });
      toast.success(`Order has been assigned to ${courierName}`);
    } catch (error) {
      toast.error('Failed to ship the order. Please try again.');
    } finally {
      setIsShipping(null);
    }
  };

  const filterCouriersByTab = (rates: CourierRate[]) => {
    if (activeTab === 'All') return rates;
    if (activeTab === 'Air') return rates.filter((rate) => rate.type === 'AIR');
    if (activeTab === 'Surface') return rates.filter((rate) => rate.type === 'SURFACE');
    if (activeTab === 'Self-Fulfilled') return rates.filter((rate) => rate.name.includes('Self'));
    if (activeTab === 'Non-Serviceable')
      return rates.filter((rate) => !rate.courier.is_fw_applicable);
    return rates;
  };

  const sortCouriers = (rates: CourierRate[]) => {
    const sorted = [...rates];
    if (sortBy === 'price-low') return sorted.sort((a, b) => a.charge - b.charge);
    if (sortBy === 'price-high') return sorted.sort((a, b) => b.charge - a.charge);
    if (sortBy === 'rating') return sorted.sort((a, b) => 4.5 - 4.0); // Mock rating sort
    return sorted;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Package className="text-muted-foreground mx-auto h-12 w-12 animate-pulse" />
            <p className="text-muted-foreground mt-2">Loading shipping rates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load shipping rates. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredRates = sortCouriers(filterCouriersByTab(data.rates));
  const order = data.order;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Panel - Order Details */}
        <div className="w-80 space-y-6 border-r border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Order Details</h2>

          <div className="space-y-4">
            {/* Pickup Location */}
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Pickup From
              </div>
              <div className="font-medium">
                {order?.hub?.address?.pincode}, {order?.hub?.address?.city}
              </div>
              <div className="text-muted-foreground text-sm">India</div>
            </div>

            <Separator />

            {/* Delivery Location */}
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Deliver To
              </div>
              <div className="font-medium">
                {order?.customer?.address?.pincode}, {order?.customer?.address?.city}
              </div>
              <div className="text-muted-foreground text-sm">India</div>
            </div>

            <Separator />

            {/* Order Value */}
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4" />
                Order Value
              </div>
              <div className="text-lg font-medium">
                {currencyFormatter(order?.total_amount || 0)}
              </div>
            </div>

            <Separator />

            {/* Amount to collect */}
            {order?.amount_to_collect > 0 && order?.payment_mode === 'COD' && (
              <>
                <div>
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4" />
                    Amount to Collect
                  </div>
                  <div className="text-lg font-medium">
                    {currencyFormatter(order?.amount_to_collect || 0)}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Payment Mode */}
            <div>
              <div className="text-muted-foreground mb-1 text-sm">Payment Mode</div>
              <Badge variant="secondary">{order?.payment_mode}</Badge>
            </div>

            <Separator />

            {/* Weight */}
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                <Weight className="h-4 w-4" />
                Applicable Weight (in Kg)
              </div>
              <div className="font-medium">{order?.applicable_weight} Kg</div>
            </div>
          </div>

          {/* Buyer Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Buyer Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-muted-foreground mb-2 text-sm">
                  Last Successful Delivery To Buyer:
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100">
                      <Package className="h-3 w-3 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">On Your Store</div>
                      <div className="text-muted-foreground text-xs">No orders yet</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100">
                      <Truck className="h-3 w-3 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">On Lorrigo</div>
                      <div className="text-muted-foreground text-xs">No orders yet</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                View All Details
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Courier Selection */}
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Select Courier Partner</h1>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs and Sort */}
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-fit grid-cols-5">
                  <TabsTrigger value="All">All</TabsTrigger>
                  <TabsTrigger value="Air">Air</TabsTrigger>
                  <TabsTrigger value="Surface">Surface</TabsTrigger>
                  <TabsTrigger value="Self-Fulfilled">Self-Fulfilled</TabsTrigger>
                  <TabsTrigger value="Non-Serviceable" className="relative">
                    Non-Serviceable
                    <AlertTriangle className="ml-1 h-3 w-3 text-orange-500" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    Sort By: Custom (Sorted on courier priorities)
                  </SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Rating: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning Alert */}
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Some of your frequently used courier partners are non serviceable. Please check the
                Non-Serviceable tab for more details
              </AlertDescription>
            </Alert>

            {/* Couriers Count */}
            <div className="text-muted-foreground text-sm">
              {filteredRates.length} Couriers Found
            </div>

            {/* Couriers Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-4 text-left text-sm font-medium">Courier Partner</th>
                        <th className="p-4 text-left text-sm font-medium">Expected Pickup</th>
                        <th className="p-4 text-left text-sm font-medium">Estimated Delivery</th>
                        <th className="p-4 text-left text-sm font-medium">
                          <div className="flex items-center gap-1">
                            Chargeable Weight
                            <Info className="text-muted-foreground h-3 w-3" />
                          </div>
                        </th>
                        <th className="p-4 text-left text-sm font-medium">Zone</th>
                        <th className="p-4 text-left text-sm font-medium">
                          <div className="flex items-center gap-1">
                            Charges
                            <Info className="text-muted-foreground h-3 w-3" />
                          </div>
                        </th>
                        <th className="p-4 text-left text-sm font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.map((rate, index) => (
                        <tr key={rate.carrierId} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {/* {index === 0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-100 text-xs text-purple-700"
                                >
                                  Recommended
                                </Badge>
                              )} */}
                              <CourierLogo courierName={rate.name} />
                              <div>
                                <div className="font-medium">{rate.name}</div>
                                <div className="text-muted-foreground text-sm">
                                  {rate.type} | Min-weight: {rate.minWeight} Kg
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  RTO Charges: ₹{rate.rtoCharges}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* <td className="p-4">
                            <RatingBadge rating={4.0 + Math.random() * 0.8} />
                          </td> */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Clock className="text-muted-foreground h-4 w-4" />
                              <span>{rate.expectedPickup}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="text-muted-foreground h-4 w-4" />
                              <span>Jun 12, 2025</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span>{rate.minWeight} Kg</span>
                          </td>
                          <td className="p-4">
                            <span>{rate.order_zone}</span>
                          </td>
                          <td className="p-4">
                            <div className="text-lg font-bold">{currencyFormatter(rate.charge)}</div>
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Info className="h-3 w-3" />
                            </div>
                          </td>
                          <td className="p-4">
                            <Button
                              onClick={() => handleShipOrder(rate.carrierId, rate.name)}
                              disabled={isShipping === rate.carrierId}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {isShipping === rate.carrierId ? 'Shipping...' : 'Ship Now'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Scheduled Pickup Info */}
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <span>Auto-Scheduled Pickup</span>
              <span className="text-muted-foreground">Tomorrow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
