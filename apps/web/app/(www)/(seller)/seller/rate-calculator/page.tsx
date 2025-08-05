'use client';

import { useState, useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  toast,
} from '@lorrigo/ui/components';

import {
  Calculator,
  RotateCcw,
  Package,
  Clock,
  MapPin,
  Search,
  Filter,
  ArrowUpDown,
  Star,
  Zap,
  Shield,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useShippingOperations, RateCalculationParams, CourierRate } from '@/lib/apis/shipment';
import { currencyFormatter } from '@lorrigo/utils';

interface RateData {
  pickupPincode: string;
  deliveryPincode: string;
  weight: string;
  weightUnit: string;
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  paymentType: number;
  collectableAmount: string;
  isReversedOrder: boolean;
}

export default function RateCalculator() {
  const [formData, setFormData] = useState<RateData>({
    pickupPincode: '110080',
    deliveryPincode: '201201',
    weight: '0.3',
    weightUnit: 'kg',
    boxLength: 101,
    boxWidth: 10,
    boxHeight: 10,
    paymentType: 0,
    collectableAmount: '',
    isReversedOrder: false,
  });

  const [rates, setRates] = useState<CourierRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Change sortBy to allow 'none' for unsorted state
  const [sortBy, setSortBy] = useState<'none' | 'recommended' | 'price' | 'name' | 'pickup'>('none');
  const [filterType, setFilterType] = useState<'all' | 'SURFACE' | 'EXPRESS'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const itemsPerPage = 6;

  const { getServiceableCouriers } = useShippingOperations();

  const handleInputChange = (field: keyof RateData, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCalculate = async () => {
    if (!formData.pickupPincode || !formData.deliveryPincode || !formData.weight) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setCurrentPage(1);

    try {
      const params: RateCalculationParams = {
        pickupPincode: formData.pickupPincode,
        deliveryPincode: formData.deliveryPincode,
        weight: Number(formData.weight),
        weightUnit: formData.weightUnit as 'kg' | 'g',
        boxLength: Number(formData.boxLength),
        boxWidth: Number(formData.boxWidth),
        boxHeight: Number(formData.boxHeight),
        sizeUnit: 'cm',
        paymentType: formData.paymentType,
        collectableAmount: formData.paymentType === 1 ? Number(formData.collectableAmount) : undefined,
        isReversedOrder: formData.isReversedOrder,
      };
      const response = await getServiceableCouriers.mutateAsync(params);
      setRates(response.rates || []);
      toast.success(`Found ${response.rates?.length || 0} courier options`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to calculate rates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      pickupPincode: '',
      deliveryPincode: '',
      weight: '',
      weightUnit: 'kg',
      boxLength: 0,
      boxWidth: 0,
      boxHeight: 0,
      paymentType: 0,
      collectableAmount: '',
      isReversedOrder: false,
    });
    setRates([]);
    setSearchTerm('');
    setSortBy('none'); // Reset to unsorted state
    setCurrentPage(1);
    toast.success('All fields have been reset');
  };

  // Filter and sort rates
  const filteredAndSortedRates = useMemo(() => {
    // Apply search and type filters
    const filtered = rates.filter((rate) => {
      const matchesSearch = rate.name.toLowerCase().includes(searchTerm.toLowerCase()) || rate.nickname.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || rate.type === filterType;
      return matchesSearch && matchesType;
    });

    // Only sort if sortBy is not 'none'
    if (sortBy !== 'none') {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'recommended':
            // Prioritize recommended rates, then fall back to price
            return a.recommended === b.recommended ? a.total_price - b.total_price : a.recommended ? -1 : 1;
          case 'price':
            return a.total_price - b.total_price;
          case 'name':
            return a.name.localeCompare(b.name);
          case 'pickup':
            const pickupOrder = { Today: 0, Tomorrow: 1, 'Day After': 2 };
            return (pickupOrder[a.expected_pickup as keyof typeof pickupOrder] || 3) - (pickupOrder[b.expected_pickup as keyof typeof pickupOrder] || 3);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [rates, searchTerm, sortBy, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRates.length / itemsPerPage);
  const paginatedRates = filteredAndSortedRates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getBestValue = () => {
    if (rates.length === 0) return null;
    return rates.reduce((best, current) => (current.total_price < best.total_price ? current : best));
  };

  const getFastest = () => {
    if (rates.length === 0) return null;
    const pickupOrder = { Today: 0, Tomorrow: 1, 'Day After': 2 };
    return rates.reduce((fastest, current) => {
      const currentOrder = pickupOrder[current.expected_pickup as keyof typeof pickupOrder] || 3;
      const fastestOrder = pickupOrder[fastest.expected_pickup as keyof typeof pickupOrder] || 3;
      return currentOrder < fastestOrder ? current : fastest;
    });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-3">
      {/* Form Section */}
      <div className="xl:col-span-1">
        <Card className="sticky top-24 border-0 shadow-xl">
          <CardHeader className="bg-primary rounded-t-lg py-3 text-white dark:bg-stone-800">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Shipment Details
            </CardTitle>
            <CardDescription className="text-red-100">Enter your package information for accurate quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Pincode Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Pickup Pincode *
                </Label>
                <Input
                  id="pickup"
                  placeholder="e.g., 110085"
                  value={formData.pickupPincode}
                  onChange={(e) => handleInputChange('pickupPincode', e.target.value)}
                  className="border-gray-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery" className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4" />
                  Delivery Pincode *
                </Label>
                <Input
                  id="delivery"
                  placeholder="e.g., 110080"
                  value={formData.deliveryPincode}
                  onChange={(e) => handleInputChange('deliveryPincode', e.target.value)}
                  className="border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  className="w-full"
                  placeholder="0.5"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="length" className="text-xs">
                  L (cm)
                </Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="10"
                  value={formData.boxLength || ''}
                  onChange={(e) => handleInputChange('boxLength', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="width" className="text-xs">
                  W (cm)
                </Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="10"
                  value={formData.boxWidth || ''}
                  onChange={(e) => handleInputChange('boxWidth', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="text-xs">
                  H (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="10"
                  value={formData.boxHeight || ''}
                  onChange={(e) => handleInputChange('boxHeight', Number(e.target.value))}
                />
              </div>
            </div>
            {/* Payment Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Mode</Label>
                <Select value={formData.paymentType.toString()} onValueChange={(value) => handleInputChange('paymentType', Number(value))}>
                  <SelectTrigger className="">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">💳 Prepaid</SelectItem>
                    <SelectItem value="1">💰 Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentType === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="collectableAmount">Collectable Amount</Label>
                  <Input
                    id="collectableAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.collectableAmount}
                    onChange={(e) => handleInputChange('collectableAmount', e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2 rounded-lg bg-gray-50 p-3 dark:bg-stone-800">
                <Switch id="reverseOrder" checked={formData.isReversedOrder} onCheckedChange={(checked) => handleInputChange('isReversedOrder', checked)} />
                <Label htmlFor="reverseOrder" className="text-sm">
                  Reverse Order
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button onClick={handleCalculate} disabled={loading} className="h-12 w-full">
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Calculating Rates...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Rates
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClear} className="w-full bg-transparent">
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-6 xl:col-span-2">
        {rates.length > 0 && (
          <>
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Best Value</p>
                      <p className="text-2xl font-bold">{currencyFormatter(getBestValue()?.total_price || 0)}</p>
                      <p className="text-xs text-green-100">{getBestValue()?.name}</p>
                    </div>
                    <Star className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Fastest Delivery</p>
                      <p className="text-2xl font-bold">{getFastest()?.expected_pickup}</p>
                      <p className="text-xs text-blue-100">{getFastest()?.name}</p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Total Options</p>
                      <p className="text-2xl font-bold">{rates.length}</p>
                      <p className="text-xs text-purple-100">Courier Services</p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      <Input placeholder="Search couriers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64 pl-10" />
                    </div>

                    <Select value={filterType} onValueChange={(value: 'all' | 'SURFACE' | 'EXPRESS') => setFilterType(value)}>
                      <SelectTrigger className="w-40">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="SURFACE">Surface</SelectItem>
                        <SelectItem value="EXPRESS">Express</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(value: 'none' | 'recommended' | 'price' | 'name' | 'pickup') => setSortBy(value)}>
                      <SelectTrigger className="w-40">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Default Order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default Order</SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="price">Sort by Price</SelectItem>
                        <SelectItem value="name">Sort by Name</SelectItem>
                        <SelectItem value="pickup">Sort by Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-gray-600">
                    Showing {paginatedRates.length} of {filteredAndSortedRates.length} results
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {paginatedRates.map((rate, index) => (
                <Card key={rate.id} className="group overflow-hidden border-0 bg-white/90 backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
                  <div className={`h-1 bg-gradient-to-r ${rate.type === 'EXPRESS' ? 'from-orange-400 to-red-500' : 'from-blue-400 to-indigo-500'}`} />
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{rate.name}</h3>
                          {index === 0 && sortBy === 'price' && <Badge className="bg-green-100 text-xs text-green-800">Best Value</Badge>}
                          {rate.recommended && (
                            <Badge variant="status_success" className="bg-green-100 text-xs text-green-800">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-gray-600">{rate.nickname}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{rate.expected_pickup}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{rate.zone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{currencyFormatter(rate.total_price)}</div>
                        <Badge variant={rate.type === 'SURFACE' ? 'secondary' : 'default'} className="mt-1">
                          {rate.type}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Base Price:</span>
                        <span className="font-medium">{currencyFormatter(rate.base_price)}</span>
                      </div>
                      {rate.weight_charges > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Weight Charges:</span>
                          <span className="font-medium">{currencyFormatter(rate.weight_charges)}</span>
                        </div>
                      )}
                      {rate.cod_charges > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">COD Charges:</span>
                          <span className="font-medium">{currencyFormatter(rate.cod_charges)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2 text-sm">
                        <span className="text-gray-600">RTO Charges:</span>
                        <span className="font-medium text-orange-600">{currencyFormatter(rate.rto_charges)}</span>
                      </div>
                    </div>

                    {/* <div className="mt-4 border-t pt-4">
                        <div className="flex flex-wrap gap-2">
                          {rate.is_cod_applicable && (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs text-blue-700">
                              COD Available
                            </Badge>
                          )}
                          {rate.is_fw_applicable && (
                            <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700">
                              Forward
                            </Badge>
                          )}
                          {rate.is_rto_applicable && (
                            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-xs text-orange-700">
                              RTO
                            </Badge>
                          )}
                        </div>
                      </div> */}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="h-8 w-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {rates.length === 0 && !loading && (
          <Card className="border-0 shadow-lg backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
                <Package className="h-12 w-12 text-red-700" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Ready to Calculate Rates?</h3>
              <p className="mb-6 text-gray-600 dark:text-white">Fill in your shipment details and discover the best courier options with competitive rates.</p>
              <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-white">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Instant Quotes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Secure & Reliable</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span>Best Rates</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
