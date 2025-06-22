import type { CourierPricing } from "../types/shipping-plan"
import { defaultZonePricing, zoneMapping } from "../constants/shipping-plan-constants"
import { ZoneLabel } from "@lorrigo/db"

export const formatZonePricing = (zonePricingArray: any[]) => {
  if (!zonePricingArray || !Array.isArray(zonePricingArray)) {
    return {
      Z_A: { ...defaultZonePricing },
      Z_B: { ...defaultZonePricing },
      Z_C: { ...defaultZonePricing },
      Z_D: { ...defaultZonePricing },
      Z_E: { ...defaultZonePricing },
    }
  }

  const formattedZonePricing: any = {
    Z_A: { ...defaultZonePricing },
    Z_B: { ...defaultZonePricing },
    Z_C: { ...defaultZonePricing },
    Z_D: { ...defaultZonePricing },
    Z_E: { ...defaultZonePricing },
  }

  zonePricingArray.forEach((zone) => {
    const formKey = zoneMapping[zone.zone]
    if (formKey) {
      formattedZonePricing[formKey] = {
        base_price: zone.base_price || 0,
        increment_price: zone.increment_price || 0,
        is_rto_same_as_fw: zone.is_rto_same_as_fw || true,
        rto_base_price: zone.rto_base_price || 0,
        rto_increment_price: zone.rto_increment_price || 0,
        flat_rto_charge: zone.flat_rto_charge || 0,
      }
    }
  })

  return formattedZonePricing
}

export const applyBulkPriceAdjustment = (
  courierPricing: CourierPricing[],
  selectedIndices: Set<number>,
  adjustmentPercent: number,
): CourierPricing[] => {
  const zones: ZoneLabel[] = ["Z_A", "Z_B", "Z_C", "Z_D", "Z_E"]

  return courierPricing.map((courier, index) => {
    if (!selectedIndices.has(index)) {
      return courier
    }

    const updatedZonePricing = { ...courier.zonePricing }

    zones.forEach((zone) => {
      const zonePricing = courier.zonePricing[zone as keyof typeof courier.zonePricing]
      updatedZonePricing[zone as keyof typeof updatedZonePricing] = {
        ...zonePricing,
        base_price: Number((zonePricing.base_price * (1 + adjustmentPercent / 100)).toFixed(2)),
        increment_price: Number((zonePricing.increment_price * (1 + adjustmentPercent / 100)).toFixed(2)),
        rto_base_price: Number((zonePricing.rto_base_price * (1 + adjustmentPercent / 100)).toFixed(2)),
        rto_increment_price: Number((zonePricing.rto_increment_price * (1 + adjustmentPercent / 100)).toFixed(2)),
        flat_rto_charge: Number((zonePricing.flat_rto_charge * (1 + adjustmentPercent / 100)).toFixed(2)),
      }
    })

    return {
      ...courier,
      zonePricing: updatedZonePricing,
    }
  })
}

export const calculatePriceDifference = (originalPrice: number, newPrice: number) => {
  const difference = newPrice - originalPrice
  const percentageChange = originalPrice > 0 ? (difference / originalPrice) * 100 : 0
  return {
    difference,
    percentageChange,
    hasChanged: Math.abs(difference) > 0.01,
  }
}

export const formatPriceChange = (original: number, current: number) => {
  const { difference, percentageChange, hasChanged } = calculatePriceDifference(original, current)

  if (!hasChanged) return null

  return {
    original,
    current,
    difference,
    percentageChange: Math.round(percentageChange * 100) / 100,
    isIncrease: difference > 0,
  }
}
