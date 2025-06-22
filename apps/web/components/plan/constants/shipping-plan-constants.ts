import { Building2, MapPin } from "lucide-react"
import type { ZonePricing, CourierPricing } from "../types/shipping-plan"

export const defaultZonePricing: ZonePricing = {
  base_price: 0,
  is_fw_applicable: false,
  increment_price: 0,
  is_rto_same_as_fw: true,
  rto_base_price: 0,
  rto_increment_price: 0,
  flat_rto_charge: 0,
}

export const defaultCourierPricing: CourierPricing = {
  courierId: "",
  cod_charge_hard: 40,
  cod_charge_percent: 1.5,
  is_fw_applicable: true,
  is_rto_applicable: false,
  is_cod_applicable: true,
  is_cod_reversal_applicable: true,
  weight_slab: 0.5,
  increment_weight: 0.5,
  increment_price: 0,
  zonePricing: {
    Z_A: { ...defaultZonePricing, is_rto_same_as_fw: false },
    Z_B: { ...defaultZonePricing, is_rto_same_as_fw: false },
    Z_C: { ...defaultZonePricing, is_rto_same_as_fw: false },
    Z_D: { ...defaultZonePricing, is_rto_same_as_fw: false },
    Z_E: { ...defaultZonePricing, is_rto_same_as_fw: false },
  },
}

export const zoneLabels = {
  Z_A: {
    name: "Zone A - Within City",
    icon: Building2,
  },
  Z_B: {
    name: "Zone B - Within State",
    icon: MapPin,
  },
  Z_C: {
    name: "Zone C - Metro Cities",
    icon: Building2,
  },
  Z_D: {
    name: "Zone D - Rest of India",
    icon: MapPin,
  },
  Z_E: {
    name: "Zone E - North East",
    icon: MapPin,
  },
} as const

export const zoneMapping: Record<string, string> = {
  WITHIN_CITY: "Z_A",
  WITHIN_STATE: "Z_B",
  WITHIN_METRO: "Z_C",
  WITHIN_ROI: "Z_D",
  NORTH_EAST: "Z_E",
}
