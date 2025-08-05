'use client';

import React from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Separator } from '@lorrigo/ui/components';
import { Package, Weight, DollarSign, Truck, Clock, AlertTriangle, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { currencyFormatter, formatDateTimeSmart } from '@lorrigo/utils';
import { CopyBtn } from '@/components/copy-btn';
import type { BillingRecord } from '@/lib/apis/billing';

interface BillingCodeCellProps {
  record: BillingRecord;
}

export function BillingCodeCell({ record }: BillingCodeCellProps) {
  return (
    <div className="flex flex-col space-y-1">
      <CopyBtn
        label={record.code}
        className="font-medium text-blue-600"
        labelClassName="text-blue-600 hover:underline underline-offset-2"
        tooltipText="Copy Billing Code"
        text={record.code}
      />
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Clock className="h-3 w-3" />
        {formatDateTimeSmart(record.billing_date)}
      </div>
      <Badge variant="outline" className="w-fit text-xs">
        {record.billing_month}
      </Badge>
    </div>
  );
}

interface OrderDetailsCellProps {
  record: BillingRecord;
}

export function OrderDetailsCell({ record }: OrderDetailsCellProps) {
  return (
    <div className="flex flex-col space-y-1">
      <CopyBtn
        label={record.order.order_number}
        className="font-medium text-blue-600"
        labelClassName="text-blue-600 hover:underline underline-offset-2"
        tooltipText="Copy Order Number"
        text={record.order.order_number}
      />
      <div className="text-muted-foreground text-sm">
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          <CopyBtn label={record.order.customer.name} tooltipText="Copy Customer Name" text={record.order.customer.name} />
        </div>
      </div>
      <div className="text-muted-foreground text-xs">
        <CopyBtn label={record.order.customer.phone} tooltipText="Copy Phone" text={record.order.customer.phone} />
      </div>
      {record.order.customer.email && (
        <div className="text-muted-foreground text-xs">
          <CopyBtn label={record.order.customer.email} tooltipText="Copy Email" text={record.order.customer.email} />
        </div>
      )}
    </div>
  );
}

interface ShipmentDetailsCellProps {
  record: BillingRecord;
}

export function ShipmentDetailsCell({ record }: ShipmentDetailsCellProps) {
  return (
    <div className="flex flex-col space-y-1">
      <div className="text-sm font-medium">
        AWB: <CopyBtn label={record.awb} tooltipText="Copy AWB" text={record.awb} className="text-blue-600" />
      </div>
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Truck className="h-3 w-3" />
        {record.courier_name}
      </div>
      <div className="text-muted-foreground text-xs">
        Hub: {record.order.hub.name}, Pincode: ({record.order.hub.address.pincode})
      </div>
      {(record.order_zone || record.charged_zone) && (
        <div className="text-muted-foreground text-xs">
          Zone: {record.order_zone} {record.charged_zone && record.order_zone !== record.charged_zone && `→ ${record.charged_zone}`}
        </div>
      )}
    </div>
  );
}

interface WeightDetailsCellProps {
  record: BillingRecord;
}

export function WeightDetailsCell({ record }: WeightDetailsCellProps) {
  const hasWeightDispute = record.has_weight_dispute;
  const weightDifference = record.weight_difference || 0;
  const originalWeight = record.original_weight || record.order_weight;
  const isWeightChanged = originalWeight !== record.charged_weight;

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center gap-1">
        <Weight className="h-3 w-3" />
        <span className="font-medium">Charged: {record.charged_weight}kg</span>
        {hasWeightDispute && (
          <Badge className="bg-red-100 text-xs text-red-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Disputed
          </Badge>
        )}
        {isWeightChanged && !hasWeightDispute && <AlertTriangle className="h-3 w-3 text-orange-500" />}
      </div>

      <div className="text-muted-foreground text-sm">Original: {originalWeight}kg</div>

      <div className="text-muted-foreground text-xs">Base Weight: {record.base_weight}kg</div>

      {weightDifference > 0 && (
        <div className={`text-xs ${hasWeightDispute ? 'text-red-600' : 'text-orange-600'}`}>Weight difference: +{weightDifference.toFixed(2)}kg</div>
      )}

      {record.has_weight_dispute && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>Under review</span>
        </div>
      )}

      <div className="text-muted-foreground text-xs">
        Zone: {record.order_zone} → {record.charged_zone || record.order_zone}
      </div>
    </div>
  );
}

interface BasePricingCellProps {
  record: BillingRecord;
}

export function BasePricingCell({ record }: BasePricingCellProps) {
  return (
    <div className="space-y-1 text-right">
      <div className="text-muted-foreground text-sm">Base {currencyFormatter(record.base_price)}</div>
      {record.increment_price > 0 && <div className="text-muted-foreground text-sm">Increment: +{currencyFormatter(record.increment_price)}</div>}
    </div>
  );
}

interface AdditionalChargesCellProps {
  record: BillingRecord;
}

export function AdditionalChargesCell({ record }: AdditionalChargesCellProps) {
  const charges = [
    {
      label: 'Forward Excess',
      amount: record.fw_excess_charge,
      applicable: record.is_forward_applicable,
    },
    { label: 'RTO Excess', amount: record.rto_excess_charge, applicable: record.is_rto_applicable },
    { label: 'Zone Change', amount: record.zone_change_charge, applicable: true },
  ];

  const totalExtra = charges.reduce((sum, charge) => sum + charge.amount, 0);

  if (totalExtra === 0) {
    return (
      <div className="text-muted-foreground text-center">
        <CheckCircle className="mx-auto mb-1 h-4 w-4" />
        <div className="text-sm">No extras</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-right">
      <div className="space-y-0.5">
        {charges.map(
          (charge, index) =>
            charge.amount > 0 && (
              <div key={index} className="text-muted-foreground text-xs">
                {charge.label}: +{currencyFormatter(charge.amount)}
              </div>
            )
        )}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        Applicable: {record.is_forward_applicable && 'FW'} {record.is_rto_applicable && 'RTO'}
      </div>
    </div>
  );
}

interface TotalAmountCellProps {
  record: BillingRecord;
}

export function TotalAmountCell({ record }: TotalAmountCellProps) {
  const extraCharges = record.fw_excess_charge + record.rto_excess_charge + record.zone_change_charge;

  return (
    <div className="space-y-1 text-right">
      <div className="text-primary text-xl font-bold">{currencyFormatter(record.billing_amount)}</div>
      <div className="text-muted-foreground text-xs">Extras: +{currencyFormatter(extraCharges)}</div>
    </div>
  );
}

interface PaymentStatusCellProps {
  record: BillingRecord;
}

export function PaymentStatusCell({ record }: PaymentStatusCellProps) {
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        );
      case 'DISPUTED':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Disputed
          </Badge>
        );
      case 'NOT_PAID':
      default:
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {getStatusBadge(record.payment_status)}
      <div className="space-y-1">
        <div className="text-muted-foreground text-xs">
          Services: {record.is_forward_applicable && 'FW'} {record.is_rto_applicable && 'RTO'}
        </div>
      </div>
    </div>
  );
}

interface BillingSummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  textColor?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

export function BillingSummaryCard({ title, value, description, icon: Icon, textColor, trend }: BillingSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textColor || ''}`}>{value}</div>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
        {trend && (
          <div className={`mt-1 flex items-center gap-1 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DetailedBillingCardProps {
  record: BillingRecord;
  showActions?: boolean;
  onViewOrder?: () => void;
  onViewShipment?: () => void;
}

export function DetailedBillingCard({ record, showActions = false, onViewOrder, onViewShipment }: DetailedBillingCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Billing Details</span>
          <PaymentStatusCell record={record} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <Package className="h-4 w-4" />
              Order Information
            </h4>
            <OrderDetailsCell record={record} />
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <Truck className="h-4 w-4" />
              Shipment Information
            </h4>
            <ShipmentDetailsCell record={record} />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <Weight className="h-4 w-4" />
              Weight Details
            </h4>
            <WeightDetailsCell record={record} />
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <Calculator className="h-4 w-4" />
              Base Pricing
            </h4>
            <BasePricingCell record={record} />
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <DollarSign className="h-4 w-4" />
              Additional Charges
            </h4>
            <AdditionalChargesCell record={record} />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="mb-1 font-medium">Total Billing Amount</h4>
            <TotalAmountCell record={record} />
          </div>

          {showActions && (
            <div className="space-x-2">
              {onViewOrder && (
                <button onClick={onViewOrder} className="text-sm text-blue-600 hover:underline">
                  View Order
                </button>
              )}
              {onViewShipment && (
                <button onClick={onViewShipment} className="text-sm text-blue-600 hover:underline">
                  View Shipment
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
