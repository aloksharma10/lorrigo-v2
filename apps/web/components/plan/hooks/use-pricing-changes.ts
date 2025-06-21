"use client"

import { useMemo } from "react"
import type { CourierPricing } from "../types/shipping-plan"

export function usePricingChanges(currentPricing: CourierPricing[], originalPricing: CourierPricing[]) {
  return useMemo(() => {
    if (!originalPricing.length || !currentPricing.length) {
      return { hasChanges: false, changedCouriers: new Set<number>() }
    }

    const changedCouriers = new Set<number>()

    currentPricing.forEach((current, index) => {
      const original = originalPricing[index]
      if (!original) return

      // Check if any zone pricing has changed
      Object.entries(current.zonePricing).forEach(([zone, currentZone]) => {
        const originalZone = original.zonePricing[zone as keyof typeof original.zonePricing]
        if (
          Math.abs(currentZone.base_price - originalZone.base_price) > 0.01 ||
          Math.abs(currentZone.increment_price - originalZone.increment_price) > 0.01 ||
          Math.abs(currentZone.rto_base_price - originalZone.rto_base_price) > 0.01 ||
          Math.abs(currentZone.rto_increment_price - originalZone.rto_increment_price) > 0.01 ||
          Math.abs(currentZone.flat_rto_charge - originalZone.flat_rto_charge) > 0.01
        ) {
          changedCouriers.add(index)
        }
      })
    })

    return {
      hasChanges: changedCouriers.size > 0,
      changedCouriers,
    }
  }, [currentPricing, originalPricing])
}
