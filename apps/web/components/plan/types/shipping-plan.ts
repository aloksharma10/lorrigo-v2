export interface Courier {
   id: string
   name: string
   code: string
   is_active: boolean
 }
 
 export interface ZonePricing {
   base_price: number
   increment_price: number
   is_rto_same_as_fw: boolean
   rto_base_price: number
   rto_increment_price: number
   flat_rto_charge: number
 }
 
 export interface CourierPricing {
   courierId: string
   cod_charge_hard: number
   cod_charge_percent: number
   is_fw_applicable: boolean
   is_rto_applicable: boolean
   is_cod_applicable: boolean
   is_cod_reversal_applicable: boolean
   weight_slab: number
   increment_weight: number
   increment_price: number
   zonePricing: {
     Z_A: ZonePricing
     Z_B: ZonePricing
     Z_C: ZonePricing
     Z_D: ZonePricing
     Z_E: ZonePricing
   }
 }
 
 export interface ShippingPlan {
   id?: string
   name: string
   description: string
   isDefault: boolean
   features: string[]
   courierPricing: CourierPricing[]
 }
 
 export interface EnhancedCreatePlanFormProps {
   planData?: any
   isEditing?: boolean
 }
 