'use client';
import { Button, DrawerComponent, Card, Badge, Skeleton, Alert, AlertDescription } from '@lorrigo/ui/components';
import { X, Package, Truck, RotateCcw, MapPin } from 'lucide-react';
import { DrawerSize, DrawerSide } from '@lorrigo/ui/components';
import { useCourierOperations, type CourierPricing } from '@/lib/apis/couriers';
import { currencyFormatter } from '@lorrigo/utils';

export default function CourierRates({
  courierName,
  courierId,
  onClose,
  isLoading = false,
  isOpen = false,
  drawerId,
  size = 'lg',
  side = 'right',
}: {
  courierName?: string;
  courierId?: string;
  onClose: () => void;
  isLoading?: boolean;
  isOpen?: boolean;
  drawerId?: string;
  size?: DrawerSize;
  side?: DrawerSide;
}) {
  const { getCourierPricing } = useCourierOperations();
  const courierPricingQuery = getCourierPricing(courierId || '');

  const formatZoneName = (zone: string) => {
    return zone.replace('Z_', 'Zone ');
  };

  const renderZonePricing = (zonePricing: CourierPricing['zone_pricing']) => {
    return zonePricing.map((zone) => (
      <Card key={zone.id} className="mb-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <h3 className="text-lg font-semibold">{formatZoneName(zone.zone)}</h3>
          </div>
          <Badge variant={zone.is_rto_same_as_fw ? 'default' : 'secondary'}>{zone.is_rto_same_as_fw ? 'Same RTO' : 'Different RTO'}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Forward Pricing */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
              <Truck className="h-3 w-3" />
              Forward Pricing
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Base Price:</span>
                <span className="font-medium">{currencyFormatter(zone.base_price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Increment Price:</span>
                <span className="font-medium">{currencyFormatter(zone.increment_price)}</span>
              </div>
            </div>
          </div>

          {/* RTO Pricing */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
              <RotateCcw className="h-3 w-3" />
              RTO Pricing
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Base Price:</span>
                <span className="font-medium">{currencyFormatter(zone.rto_base_price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Increment Price:</span>
                <span className="font-medium">{currencyFormatter(zone.rto_increment_price)}</span>
              </div>
              {zone.flat_rto_charge > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Flat Charge:</span>
                  <span className="font-medium">{currencyFormatter(zone.flat_rto_charge)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    ));
  };

  const renderPricingDetails = (pricing: CourierPricing) => (
    <div className="space-y-6">
      {/* General Information */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5 text-blue-500" />
          General Information
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Weight Slab:</span>
              <span className="font-medium">{pricing.weight_slab} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Increment Weight:</span>
              <span className="font-medium">{pricing.increment_weight} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Increment Price:</span>
              <span className="font-medium">{currencyFormatter(pricing.increment_price)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>COD Charge (Fixed):</span>
              <span className="font-medium">{currencyFormatter(pricing.cod_charge_hard)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>COD Charge (%):</span>
              <span className="font-medium">{pricing.cod_charge_percent}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Service Features */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Truck className="h-5 w-5 text-green-500" />
          Service Features
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <Badge variant={pricing.is_fw_applicable ? 'default' : 'secondary'} className="text-xs">
              {pricing.is_fw_applicable ? '✓' : '✗'}
            </Badge>
            <span className="text-sm">Forward</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pricing.is_rto_applicable ? 'default' : 'secondary'} className="text-xs">
              {pricing.is_rto_applicable ? '✓' : '✗'}
            </Badge>
            <span className="text-sm">RTO</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pricing.is_cod_applicable ? 'default' : 'secondary'} className="text-xs">
              {pricing.is_cod_applicable ? '✓' : '✗'}
            </Badge>
            <span className="text-sm">COD</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pricing.is_cod_reversal_applicable ? 'default' : 'secondary'} className="text-xs">
              {pricing.is_cod_reversal_applicable ? '✓' : '✗'}
            </Badge>
            <span className="text-sm">COD Reversal</span>
          </div>
        </div>
      </Card>

      {/* Zone Pricing */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5 text-purple-500" />
          Zone-wise Pricing
        </h3>
        {renderZonePricing(pricing.zone_pricing)}
      </div>
    </div>
  );

  return (
    <DrawerComponent open={isOpen} onOpenChange={onClose} size={size} side={side}>
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-4 py-4">
        <DrawerComponent.Title className="flex items-center gap-2 text-sm font-semibold md:text-base lg:text-xl">
          <Truck className="text-primary h-5 w-5" />
          {courierName || 'Courier'} Rates
        </DrawerComponent.Title>
        <DrawerComponent.Close asChild>
          <Button variant="outline" className="h-auto w-fit p-1" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </DrawerComponent.Close>
      </div>
      <div className="flex-1 overflow-auto p-4 lg:py-0 lg:pt-4">
        {courierPricingQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : courierPricingQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{courierPricingQuery.error?.message || 'Failed to load courier pricing. Please try again.'}</AlertDescription>
          </Alert>
        ) : courierPricingQuery.data?.result ? (
          renderPricingDetails(courierPricingQuery.data.result)
        ) : (
          <div className="py-8 text-center">
            <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">No Pricing Available</h3>
            <p className="text-muted-foreground">Pricing information for this courier is not available.</p>
          </div>
        )}
      </div>
    </DrawerComponent>
  );
}
