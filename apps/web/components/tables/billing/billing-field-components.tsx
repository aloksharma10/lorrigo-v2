'use client';

import React from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Separator } from '@lorrigo/ui/components';
import { Package, Weight, DollarSign, Truck, CreditCard, Clock, AlertTriangle, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
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
        className="text-blue-600 font-medium"
        labelClassName="text-blue-600 hover:underline underline-offset-2"
        tooltipText="Copy Billing Code"
        text={record.code}
      />
      <div className="text-sm text-muted-foreground flex items-center gap-1">
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
        className="text-blue-600 font-medium"
        labelClassName="text-blue-600 hover:underline underline-offset-2"
        tooltipText="Copy Order Number"
        text={record.order.order_number}
      />
      <div className="text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          <CopyBtn
            label={record.order.customer.name}
            tooltipText="Copy Customer Name"
            text={record.order.customer.name}
          />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        <CopyBtn
          label={record.order.customer.phone}
          tooltipText="Copy Phone"
          text={record.order.customer.phone}
        />
      </div>
      {record.order.customer.email && (
        <div className="text-xs text-muted-foreground">
          <CopyBtn
            label={record.order.customer.email}
            tooltipText="Copy Email"
            text={record.order.customer.email}
          />
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
        AWB: <CopyBtn 
          label={record.order.shipment.awb} 
          tooltipText="Copy AWB" 
          text={record.order.shipment.awb}
          className="text-blue-600"
        />
      </div>
      <div className="text-sm text-muted-foreground flex items-center gap-1">
        <Truck className="h-3 w-3" />
        {record.courier_name}
      </div>
      <div className="text-xs text-muted-foreground">
        Hub: {record.order.hub.name}
      </div>
      {(record.order_zone || record.charged_zone) && (
        <div className="text-xs text-muted-foreground">
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
        <span className="font-medium">
          Charged: {record.charged_weight}kg
        </span>
        {hasWeightDispute && (
          <Badge className="bg-red-100 text-red-800 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Disputed
          </Badge>
        )}
        {isWeightChanged && !hasWeightDispute && (
          <AlertTriangle className="h-3 w-3 text-orange-500" />
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        Original: {originalWeight}kg
      </div>
      
      <div className="text-xs text-muted-foreground">
        Base Weight: {record.base_weight}kg
      </div>
      
      {weightDifference > 0 && (
        <div className={`text-xs ${hasWeightDispute ? 'text-red-600' : 'text-orange-600'}`}>
          Weight difference: +{weightDifference.toFixed(2)}kg
        </div>
      )}
      
      {record.order.weight_dispute && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Under review</span>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
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
    <div className="text-right space-y-1">
      <div className="font-bold text-lg">
        {currencyFormatter(record.base_price)}
      </div>
      <div className="text-xs text-muted-foreground">
        Base ({record.base_weight}kg)
      </div>
      {record.increment_price > 0 && (
        <div className="text-sm text-orange-600">
          +{currencyFormatter(record.increment_price)}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Rate: {currencyFormatter(record.base_price / record.base_weight)}/kg
      </div>
    </div>
  );
}

interface AdditionalChargesCellProps {
  record: BillingRecord;
}

export function AdditionalChargesCell({ record }: AdditionalChargesCellProps) {
  const charges = [
    { label: 'Forward Excess', amount: record.fw_excess_charge, applicable: record.is_forward_applicable },
    { label: 'RTO Excess', amount: record.rto_excess_charge, applicable: record.is_rto_applicable },
    { label: 'Zone Change', amount: record.zone_change_charge, applicable: true },
    { label: 'COD Fee', amount: record.cod_charge, applicable: true },
  ];

  const totalExtra = charges.reduce((sum, charge) => sum + charge.amount, 0);

  if (totalExtra === 0) {
    return (
      <div className="text-center text-muted-foreground">
        <CheckCircle className="h-4 w-4 mx-auto mb-1" />
        <div className="text-sm">No extras</div>
      </div>
    );
  }

  return (
    <div className="text-right space-y-1">
      <div className="font-medium text-orange-600">
        +{currencyFormatter(totalExtra)}
      </div>
      <div className="space-y-0.5">
        {charges.map((charge, index) => 
          charge.amount > 0 && (
            <div key={index} className="text-xs text-muted-foreground">
              {charge.label}: +{currencyFormatter(charge.amount)}
            </div>
          )
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Applicable: {record.is_forward_applicable && 'FW'} {record.is_rto_applicable && 'RTO'}
      </div>
    </div>
  );
}

interface TotalAmountCellProps {
  record: BillingRecord;
}

export function TotalAmountCell({ record }: TotalAmountCellProps) {
  const extraCharges = record.fw_excess_charge + record.rto_excess_charge + 
                      record.zone_change_charge + record.cod_charge;
  const baseTotal = record.base_price + record.increment_price;
  
  return (
    <div className="text-right space-y-1">
      <div className="font-bold text-xl text-primary">
        {currencyFormatter(record.billing_amount)}
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>Base: {currencyFormatter(baseTotal)}</div>
        {extraCharges > 0 && (
          <div>Extras: +{currencyFormatter(extraCharges)}</div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Final Amount
      </div>
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
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'DISPUTED':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Disputed
          </Badge>
        );
      case 'NOT_PAID':
      default:
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {getStatusBadge(record.payment_status)}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {record.is_processed ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <Clock className="h-3 w-3 text-orange-500" />
          )}
          {record.is_processed ? 'Processed' : 'Processing'}
        </div>
        <div className="text-xs text-muted-foreground">
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

export function BillingSummaryCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  textColor,
  trend 
}: BillingSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textColor || ''}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={`text-xs flex items-center gap-1 mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>{trend.value}% {trend.label}</span>
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

export function DetailedBillingCard({ 
  record, 
  showActions = false,
  onViewOrder,
  onViewShipment 
}: DetailedBillingCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Billing Details</span>
          <PaymentStatusCell record={record} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Information
            </h4>
            <OrderDetailsCell record={record} />
          </div>
          
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipment Information
            </h4>
            <ShipmentDetailsCell record={record} />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Weight Details
            </h4>
            <WeightDetailsCell record={record} />
          </div>
          
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Base Pricing
            </h4>
            <BasePricingCell record={record} />
          </div>
          
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Additional Charges
            </h4>
            <AdditionalChargesCell record={record} />
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium mb-1">Total Billing Amount</h4>
            <TotalAmountCell record={record} />
          </div>
          
          {showActions && (
            <div className="space-x-2">
              {onViewOrder && (
                <button 
                  onClick={onViewOrder}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Order
                </button>
              )}
              {onViewShipment && (
                <button 
                  onClick={onViewShipment}
                  className="text-blue-600 hover:underline text-sm"
                >
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