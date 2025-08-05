'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Package, Weight, AlertTriangle, Clock, Calendar, Info, Search, Shield, Menu, Loader2 } from 'lucide-react';
import {
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
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Checkbox,
  toast,
} from '@lorrigo/ui/components';
import { CourierRate, useShippingOperations } from '@/lib/apis/shipment';
import HoverCardToolTip from '@/components/hover-card-tooltip';
import ShipOrderPageSkeleton from '@/components/skeletons/select-courier-skeleton';
import ActionTooltip from '@/components/action-tooltip';
import { CopyBtn } from '@/components/copy-btn';
import { DesktopOrderDetails } from '../components/desktop-order-summary';
import { MobileOrderSummary } from '../components/mobile-order-summary';
import { currencyFormatter } from '@lorrigo/utils';
import { CourierLogo } from '@/components/courier-logo';
import { RatingBadgeStart } from '@/components/rating-badge';

export default function ShipOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = (params?.orderId as string) || 'ORD-12345';
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState('custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(true);
  const [priceFilter, setPriceFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [showMobileOrderDetails, setShowMobileOrderDetails] = useState(false);
  const [autoScheduledPickup, setAutoScheduledPickup] = useState(false);

  const {
    getShippingRates,
    shipOrder: { data: shipmentData, mutateAsync: createShipment, isPending: isCreatingShipment, isSuccess: isShipmentCreated },
  } = useShippingOperations();
  const { data, isLoading, error } = getShippingRates(orderId);

  const handleShipOrder = async (carrierId: string, courierName: string) => {
    try {
      toast.promise(
        createShipment({
          order_id: orderId,
          courier_id: carrierId,
          is_schedule_pickup: autoScheduledPickup,
        }),
        {
          loading: 'Creating shipment...',
          success: 'Shipment created successfully',
          error: 'Failed to create shipment',
        }
      );
    } catch (error) {
      console.error('Failed to ship order');
    } finally {
      setAutoScheduledPickup(false);
    }
  };

  useEffect(() => {
    if (isShipmentCreated) {
      router.push(`/seller/orders/${shipmentData?.shipment?.is_reverse_order ? 'reverse' : 'forward'}-shipments/all`);
    }
  }, [isShipmentCreated]);

  const filterCouriersByTab = (rates: CourierRate[]) => {
    if (!rates) return [];
    let filtered = rates;

    // Filter by tab
    if (activeTab === 'Air') filtered = filtered.filter((rate) => rate.type === 'AIR');
    if (activeTab === 'Surface') filtered = filtered.filter((rate) => rate.type === 'SURFACE');

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter((rate) => rate.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Filter by price
    if (priceFilter === 'under-500') filtered = filtered.filter((rate) => rate.total_price < 500);
    if (priceFilter === '500-1000') filtered = filtered.filter((rate) => rate.total_price >= 500 && rate.total_price <= 1000);
    if (priceFilter === 'above-1000') filtered = filtered.filter((rate) => rate.total_price > 1000);

    // Filter by rating
    if (ratingFilter === 'above-4.5') filtered = filtered.filter((rate) => rate.rating >= 4.5);
    if (ratingFilter === '4-4.5') filtered = filtered.filter((rate) => rate.rating >= 4 && rate.rating < 4.5);

    return filtered;
  };

  const sortCouriers = (rates: CourierRate[]) => {
    if (!rates) return [];
    const sorted = [...rates];
    if (sortBy === 'price-low') return sorted.sort((a, b) => a.total_price - b.total_price);
    if (sortBy === 'price-high') return sorted.sort((a, b) => b.total_price - a.total_price);
    if (sortBy === 'rating') return sorted.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'delivery-time') return sorted.sort((a, b) => Number.parseInt(a.estimated_delivery_days) - Number.parseInt(b.estimated_delivery_days));
    return sorted;
  };

  // Loading state
  if (isLoading) {
    return <ShipOrderPageSkeleton />;
  }

  // Error state
  if (error || !data) {
    toast.error('Failed to load shipping rates. Please try again.');
    // router.back()
    return null;
  }

  const filteredRates = sortCouriers(filterCouriersByTab(data.rates));
  const order = data.order;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="flex flex-col md:flex-row">
        {/* Desktop Order Details */}
        <DesktopOrderDetails order={order} isOpen={isOrderDetailsOpen} setIsOpen={setIsOrderDetailsOpen} />

        {/* Main Content */}
        <div className="flex-1">
          <div className="mx-auto max-w-7xl space-y-4 px-4 md:space-y-6">
            {/* Mobile Header with Order Details Sheet */}
            <div className="flex items-center justify-between md:hidden">
              <h1 className="text-xl font-bold">Select Courier</h1>
              <Sheet open={showMobileOrderDetails} onOpenChange={setShowMobileOrderDetails}>
                <SheetTrigger asChild>
                  <Button icon={Menu} variant="outline" size="sm">
                    Order Details
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Order Details</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4 px-6">
                    {/* Order ID */}
                    <div className="rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-600 dark:text-white">Order ID</div>
                      <CopyBtn text={order.order_number} label={order.order_number} labelClassName="text-blue-900 dark:text-white" className="font-semibold" />
                    </div>

                    {/* Locations */}
                    <div className="space-y-3">
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-green-600" />
                          Pickup From
                        </div>
                        <div className="pl-6 text-sm font-medium">
                          {order.hub.address.city}, {order.hub.address.state}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-600" />
                          Deliver To
                        </div>
                        <div className="pl-6 text-sm font-medium">
                          {order.customer.address.city}, {order.customer.address.state}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Key Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-muted-foreground text-sm">Order Value</div>
                        <div className="font-semibold text-green-600">{currencyFormatter(order.total_amount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-sm">Weight</div>
                        <div className="font-medium">{order.applicable_weight} Kg</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-sm">Payment</div>
                        <Badge variant={order.payment_method === 'COD' ? 'destructive' : 'default'}>{order.payment_method}</Badge>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-sm">Customer</div>
                        <div className="text-sm font-medium">{order.customer.name}</div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Header */}
            <div className="hidden items-center justify-between md:flex">
              <h1 className="text-2xl font-bold">Select Courier Partner</h1>
              <p className="text-muted-foreground">Choose the best shipping option for your order</p>
            </div>

            {/* Mobile Order Summary */}
            <MobileOrderSummary order={order} />

            {/* Filters and Controls */}
            <div className="space-y-4">
              {/* Search and Primary Filters */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
                  <Input placeholder="Search courier partners..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="w-36 flex-shrink-0">
                      <SelectValue placeholder="Price Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="under-500">Under ₹500</SelectItem>
                      <SelectItem value="500-1000">₹500 - ₹1000</SelectItem>
                      <SelectItem value="above-1000">Above ₹1000</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-32 flex-shrink-0">
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="above-4.5">4.5+ Stars</SelectItem>
                      <SelectItem value="4-4.5">4.0 - 4.5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabs and Sort */}
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 sm:w-fit">
                    <TabsTrigger value="All" className="text-xs sm:text-sm">
                      All ({data?.rates?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="Air" className="text-xs sm:text-sm">
                      Air ({data?.rates?.filter((r) => r.type === 'AIR').length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="Surface" className="text-xs sm:text-sm">
                      Surface ({data?.rates?.filter((r) => r.type === 'SURFACE').length || 0})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom (Recommended)</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Rating: High to Low</SelectItem>
                    <SelectItem value="delivery-time">Fastest Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Warning Alert */}
            {/* <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-sm">
                  Some courier partners may have limited serviceability. Check individual courier details for more
                  information.
                </AlertDescription>
              </Alert> */}

            {/* Auto-Scheduled Pickup Info */}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-800">
              <Checkbox
                className="h-4 w-4 border-blue-600 dark:border-white"
                id="auto-scheduled-pickup"
                checked={autoScheduledPickup}
                onCheckedChange={(checked) => setAutoScheduledPickup(checked === 'indeterminate' ? false : checked)}
              />
              <span className="font-medium text-blue-700 dark:text-white">Auto-Scheduled Pickup</span>
              <span className="text-blue-600 dark:text-white">Tomorrow, 10:00 AM - 6:00 PM</span>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {filteredRates.length} courier{filteredRates.length !== 1 ? 's' : ''} found
              </div>
              {filteredRates.length > 0 && (
                <div className="text-muted-foreground">Best: {currencyFormatter(Math.min(...filteredRates.map((r) => r.total_price)))}</div>
              )}
            </div>

            {/* Couriers Table - Desktop */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="p-4 text-left text-sm font-medium">Courier Partner</th>
                        <th className="p-4 text-left text-sm font-medium">Performance</th>
                        <th className="p-4 text-left text-sm font-medium">Estimated Pickup</th>
                        <th className="p-4 text-left text-sm font-medium">Estimated Delivery</th>
                        <th className="p-4 text-left text-sm font-medium">
                          <ActionTooltip label="Chargeable weight used for pricing" className="h-auto p-0">
                            <div className="flex items-center gap-1">
                              Weight
                              <Info className="h-3 w-3" />
                            </div>
                          </ActionTooltip>
                        </th>
                        <th className="p-4 text-left text-sm font-medium">Zone</th>
                        <th className="p-4 text-left text-sm font-medium">
                          <ActionTooltip label="Total shipping charges including all fees" className="h-auto p-0">
                            <div className="flex items-center gap-1">
                              Charges
                              <Info className="h-3 w-3" />
                            </div>
                          </ActionTooltip>
                        </th>
                        <th className="p-4 text-left text-sm font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.map((rate, index) => (
                        <tr key={rate.id} className="border-b transition-colors hover:bg-gray-50 dark:hover:bg-transparent">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <CourierLogo courierName={rate.name} />
                              <div>
                                <div className="font-medium">
                                  {rate.name} ({rate.nickname})
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {rate.type} • Min: {rate.breakdown.min_weight} Kg
                                </div>
                                <div className="text-muted-foreground text-xs">RTO: {currencyFormatter(rate.rto_charges)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <RatingBadgeStart rating={rate.rating} />
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-600">Reliable</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Clock className="text-muted-foreground h-4 w-4" />
                              <span className="text-sm">{rate.expected_pickup}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="text-muted-foreground h-4 w-4" />
                                <span className="text-sm">{rate.etd}</span>
                              </div>
                              <div className="text-muted-foreground text-xs">{rate.estimated_delivery_days} days</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{rate.final_weight} Kg</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{rate.zone}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">{currencyFormatter(rate.total_price)}</div>
                              <HoverCardToolTip
                                className="w-64"
                                triggerComponent={
                                  <Button variant="ghost" size="sm" className="text-muted-foreground h-auto p-0 text-xs">
                                    View breakdown
                                  </Button>
                                }
                              >
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Base Price:</span>
                                    <span>{currencyFormatter(rate.base_price)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Weight Charges:</span>
                                    <span>{currencyFormatter(rate.weight_charges)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>COD Charges:</span>
                                    <span>{currencyFormatter(rate.cod_charges)}</span>
                                  </div>
                                  <Separator />
                                  <div className="flex justify-between font-semibold">
                                    <span>Total:</span>
                                    <span>{currencyFormatter(rate.total_price)}</span>
                                  </div>
                                </div>
                              </HoverCardToolTip>
                            </div>
                          </td>
                          <td className="p-4">
                            <Button onClick={() => handleShipOrder(rate.id, rate.name)} disabled={isCreatingShipment}>
                              {isCreatingShipment ? 'Shipping...' : 'Ship Now'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Couriers Cards - Mobile */}
            <div className="space-y-3 md:hidden">
              {filteredRates.map((rate, index) => (
                <Card key={rate.id} className="relative">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CourierLogo courierName={rate.name} />
                        <div>
                          <div className="text-sm font-medium">{rate.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {rate.type} • {rate.zone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{currencyFormatter(rate.total_price)}</div>
                        <RatingBadgeStart rating={rate.rating} />
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="text-muted-foreground h-3 w-3" />
                        <span>Pickup: {rate.expected_pickup}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-3 w-3" />
                        <span>Delivery: {rate.estimated_delivery_days} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="text-muted-foreground h-3 w-3" />
                        <span>Weight: {rate.final_weight} Kg</span>
                      </div>
                      <div className="text-muted-foreground">RTO: {currencyFormatter(rate.rto_charges)}</div>
                    </div>

                    <Button
                      onClick={() => handleShipOrder(rate.id, rate.name)}
                      disabled={isCreatingShipment}
                      isLoading={isCreatingShipment}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                      size="sm"
                    >
                      {isCreatingShipment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Shipping...
                        </>
                      ) : (
                        'Ship Now'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredRates.length === 0 && (
              <div className="py-12 text-center">
                <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">No couriers found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
