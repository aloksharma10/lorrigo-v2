import { ShipmentStatus } from '@lorrigo/db';

export interface PricingLike {
  fw_charge?: number;
  rto_charge?: number;
  cod_charge?: number;
  forward_excess_charge?: number;
  rto_excess_charge?: number;
  charged_weight?: number;
  original_weight?: number;
  base_price?: number;
  weight_slab?: number;
  increment_price?: number;
  order_zone?: string;
  charged_zone?: string;
}

export interface BillingOverride {
  charged_weight?: number;
  code?: string;
  billing_date?: Date;
  billing_month?: string;
  is_manual_billing?: boolean;
  billing_cycle_id?: string | null;
  [key: string]: any;
}

export function mapShipmentToBilling(
  shipment: any,
  pricing: PricingLike = {},
  overrides: BillingOverride = {}
) {
  const isRtoApplicable = [
    ShipmentStatus.RTO_DELIVERED,
    ShipmentStatus.RTO_IN_TRANSIT,
    ShipmentStatus.RTO_INITIATED,
  ].includes(shipment.status);
  const order = shipment.order;
  const fw = shipment.fw_charge || 0;
  const rto = shipment.rto_charge || 0;
  const cod = isRtoApplicable ? 0 : shipment.cod_charge || 0;
  const fwEx = pricing.forward_excess_charge || 0;
  const rtoEx = pricing.rto_excess_charge || 0;

  const billingAmount = fw + rto + fwEx + rtoEx;

  const chargedWeight =
    overrides.charged_weight ?? pricing.charged_weight ?? 0;
  const originalWeight = order.applicable_weight ?? 0;
  const weightDiff = chargedWeight > originalWeight ? chargedWeight - originalWeight : 0;

  return {
    awb: shipment.awb,
    order_id: shipment.order_id,
    billing_amount: billingAmount,
    charged_weight: chargedWeight,
    original_weight: originalWeight,
    weight_difference: weightDiff,
    has_weight_dispute: weightDiff > 0,
    is_forward_applicable: true,
    is_rto_applicable: isRtoApplicable,
    base_price: pricing.base_price || 0,
    base_weight: pricing.weight_slab || 0,
    increment_price: pricing.increment_price || 0,
    order_weight: originalWeight,
    order_zone: shipment.order_zone,
    charged_zone: shipment.charged_zone,
    fw_charge: fw,
    rto_charge: rto,
    cod_charge: cod,
    courier_name:
      (shipment.courier?.name || '') +
      (shipment.courier?.channel_config?.nickname
        ? ' ' + shipment.courier.channel_config.nickname
        : ''),
    ...overrides,
  };
} 