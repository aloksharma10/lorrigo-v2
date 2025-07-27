import type { CourierPricing } from "../types/shipping-plan"
import { defaultZonePricing, zoneMapping } from "../constants/shipping-plan-constants"

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
    const formKey = zoneMapping[zone.zone] || zone.zone
    if (formKey && ["Z_A", "Z_B", "Z_C", "Z_D", "Z_E"].includes(formKey)) {
      formattedZonePricing[formKey] = {
        base_price: zone.base_price || 0,
        increment_price: zone.increment_price || 0,
        is_rto_same_as_fw: zone.is_rto_same_as_fw ?? true,
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
  return courierPricing.map((courier, index) => {
    if (!selectedIndices.has(index)) {
      return courier
    }

    const adjustmentFactor = 1 + adjustmentPercent / 100

    // Helper function to apply adjustment and round to 2 decimal places
    const adjustPrice = (price: number) => {
      return Math.round(price * adjustmentFactor * 100) / 100
    }

    return {
      ...courier,
      zonePricing: {
        Z_A: {
          ...courier.zonePricing.Z_A,
          base_price: adjustPrice(courier.zonePricing.Z_A.base_price),
          increment_price: adjustPrice(courier.zonePricing.Z_A.increment_price),
          rto_base_price: adjustPrice(courier.zonePricing.Z_A.rto_base_price),
          rto_increment_price: adjustPrice(courier.zonePricing.Z_A.rto_increment_price),
          flat_rto_charge: adjustPrice(courier.zonePricing.Z_A.flat_rto_charge),
        },
        Z_B: {
          ...courier.zonePricing.Z_B,
          base_price: adjustPrice(courier.zonePricing.Z_B.base_price),
          increment_price: adjustPrice(courier.zonePricing.Z_B.increment_price),
          rto_base_price: adjustPrice(courier.zonePricing.Z_B.rto_base_price),
          rto_increment_price: adjustPrice(courier.zonePricing.Z_B.rto_increment_price),
          flat_rto_charge: adjustPrice(courier.zonePricing.Z_B.flat_rto_charge),
        },
        Z_C: {
          ...courier.zonePricing.Z_C,
          base_price: adjustPrice(courier.zonePricing.Z_C.base_price),
          increment_price: adjustPrice(courier.zonePricing.Z_C.increment_price),
          rto_base_price: adjustPrice(courier.zonePricing.Z_C.rto_base_price),
          rto_increment_price: adjustPrice(courier.zonePricing.Z_C.rto_increment_price),
          flat_rto_charge: adjustPrice(courier.zonePricing.Z_C.flat_rto_charge),
        },
        Z_D: {
          ...courier.zonePricing.Z_D,
          base_price: adjustPrice(courier.zonePricing.Z_D.base_price),
          increment_price: adjustPrice(courier.zonePricing.Z_D.increment_price),
          rto_base_price: adjustPrice(courier.zonePricing.Z_D.rto_base_price),
          rto_increment_price: adjustPrice(courier.zonePricing.Z_D.rto_increment_price),
          flat_rto_charge: adjustPrice(courier.zonePricing.Z_D.flat_rto_charge),
        },
        Z_E: {
          ...courier.zonePricing.Z_E,
          base_price: adjustPrice(courier.zonePricing.Z_E.base_price),
          increment_price: adjustPrice(courier.zonePricing.Z_E.increment_price),
          rto_base_price: adjustPrice(courier.zonePricing.Z_E.rto_base_price),
          rto_increment_price: adjustPrice(courier.zonePricing.Z_E.rto_increment_price),
          flat_rto_charge: adjustPrice(courier.zonePricing.Z_E.flat_rto_charge),
        },
      },
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
