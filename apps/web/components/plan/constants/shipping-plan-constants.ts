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
  cod_charge_hard: 0,
  cod_charge_percent: 0,
  is_fw_applicable: true,
  is_rto_applicable: false,
  is_cod_applicable: true,
  is_cod_reversal_applicable: true,
  weight_slab: 0.5,
  increment_weight: 0.5,
  increment_price: 0,
  zonePricing: {
    withinCity: { ...defaultZonePricing },
    withinZone: { ...defaultZonePricing, is_rto_same_as_fw: false },
    withinMetro: { ...defaultZonePricing },
    withinRoi: { ...defaultZonePricing, is_rto_same_as_fw: false },
    northEast: { ...defaultZonePricing },
  },
}

export const zoneLabels = {
  withinCity: {
    name: "Zone A - Within City",
    icon: Building2,
  },
  withinZone: {
    name: "Zone B - Within State",
    icon: MapPin,
  },
  withinMetro: {
    name: "Zone C - Metro Cities",
    icon: Building2,
  },
  withinRoi: {
    name: "Zone D - Rest of India",
    icon: MapPin,
  },
  northEast: {
    name: "Zone E - North East",
    icon: MapPin,
  },
} as const

export const zoneMapping: Record<string, string> = {
  WITHIN_CITY: "withinCity",
  WITHIN_STATE: "withinZone",
  WITHIN_METRO: "withinMetro",
  WITHIN_ROI: "withinRoi",
  NORTH_EAST: "northEast",
}
