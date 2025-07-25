/**
 * Shipping Price Calculation Utility
 * A comprehensive utility for calculating shipping rates across different couriers
 */

import { ZoneLabel } from '@lorrigo/db';

// ================================
// TYPE DEFINITIONS
// ================================

export interface PriceCalculationParams {
  weight: number;
  weightUnit: 'kg' | 'g';
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  sizeUnit: 'cm' | 'inch';
  paymentType: 0 | 1; // 0: prepaid, 1: COD
  collectableAmount?: number;
  pickupPincode: string;
  deliveryPincode: string;
  isReversedOrder?: boolean;
}

export interface ZonePricing {
  zone: 'Z_A' | 'Z_B' | 'Z_C' | 'Z_D' | 'Z_E';
  base_price: number;
  increment_price: number;
  rto_base_price?: number;
  rto_increment_price?: number;
  is_rto_same_as_fw: boolean;
}

export interface CourierPricing {
  weight_slab: number;
  increment_weight: number;
  cod_charge_hard: number;
  cod_charge_percent: number;
  is_cod_applicable: boolean;
  is_rto_applicable: boolean;
  is_fw_applicable: boolean;
  is_cod_reversal_applicable: boolean;
  zone_pricing: ZonePricing[];
}

export interface CourierInfo {
  id: string;
  name: string;
  courier_code: string;
  nickname?: string;
  is_active: boolean;
  is_reversed_courier: boolean;
  pickup_time?: string;
  weight_slab: number;
  rating?: number;
  estimated_delivery_days?: string;
  etd?: string;
  type?: string;
  pickup_performance?: number;
  rto_performance?: number;
  delivery_performance?: number;
  recommended: boolean; // Added key to indicate if this courier is recommended
}

export interface PincodeDetails {
  city: string;
  state: string;
}

export interface PriceCalculationResult {
  courier: CourierInfo;
  pricing: CourierPricing;
  base_price: number;
  weight_charges: number;
  cod_charges: number;
  rto_charges: number;
  fw_charges: number;
  total_price: number;
  final_weight: number;
  volumetric_weight: number;
  zone: ZonePricing['zone'];
  zoneName: string;
  expected_pickup: string;
  breakdown: {
    actual_weight: number;
    volumetric_weight: number;
    chargeable_weight: number;
    min_weight: number;
    weight_increment_ratio: number;
  };
}

export interface CourierWithPricing {
  courier: CourierInfo;
  pricing: CourierPricing;
}

export interface PriceFilters {
  maxPrice?: number;
  minPrice?: number;
  courierType?: string;
  codSupported?: boolean;
  rtoSupported?: boolean;
  zone?: ZonePricing['zone'];
  excludeCourierIds?: string[];
}

export interface PriceSummary {
  totalCouriers: number;
  serviceable: number;
  cheapest?: PriceCalculationResult;
  mostExpensive?: PriceCalculationResult;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

// ================================
// CONSTANTS
// ================================

export const MetroCities = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Surat',
  'Jaipur',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Thane',
  'Bhopal',
  'Visakhapatnam',
  'Pimpri-Chinchwad',
];

export const NorthEastStates = [
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
];

export const ZoneNames = {
  Z_A: 'Zone A',
  Z_B: 'Zone B',
  Z_C: 'Zone C',
  Z_D: 'Zone D',
  Z_E: 'Zone E',
} as const;

// ================================
// VALIDATION FUNCTIONS
// ================================

export function validateCalculationParams(params: PriceCalculationParams): string[] {
  const errors: string[] = [];

  if (params.weight <= 0) {
    errors.push('Weight must be greater than 0');
  }

  if (params.boxLength <= 0 || params.boxWidth <= 0 || params.boxHeight <= 0) {
    errors.push('Box dimensions must be greater than 0');
  }

  if (!(params.paymentType === 0 || params.paymentType === 1)) {
    errors.push('Payment type must be 0 (prepaid) or 1 (COD)');
  }

  if (params.paymentType === 1 && (!params.collectableAmount || params.collectableAmount <= 0)) {
    errors.push('Collectable amount is required and must be greater than 0 for COD');
  }

  if (!params.pickupPincode || !params.deliveryPincode) {
    errors.push('Pickup and delivery pincodes are required');
  }

  return errors;
}

export function validateCourierData(courier: CourierInfo, pricing: CourierPricing): string[] {
  const errors: string[] = [];

  if (!courier.id || !courier.name) {
    errors.push('Courier ID and name are required');
  }

  if (pricing.weight_slab <= 0) {
    errors.push('Weight slab must be greater than 0');
  }

  if (pricing.increment_weight <= 0) {
    errors.push('Increment weight must be greater than 0');
  }

  if (!pricing.zone_pricing || pricing.zone_pricing.length === 0) {
    errors.push('Zone pricing is required');
  }

  return errors;
}

// ================================
// CORE CALCULATION FUNCTIONS
// ================================

/**
 * Calculate volumetric weight based on dimensions
 */
export function calculateVolumetricWeight(
  length: number,
  width: number,
  height: number,
  sizeUnit: 'cm' | 'inch' = 'cm'
): number {
  const volume =
    sizeUnit === 'cm' ? (length * width * height) / 5000 : (length * width * height) / 5;

  return Math.round(volume * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert weight to kilograms if needed
 */
export function normalizeWeight(weight: number, unit: 'kg' | 'g'): number {
  return unit === 'g' ? weight / 1000 : weight;
}

/**
 * Maps courier zone to order zone.
 * @param courierZone - Zone name from the selected courier
 * @returns Corresponding order zone code
 */
export function getOrderZoneFromCourierZone(courierZone: string): ZoneLabel {
  switch (courierZone) {
    case 'Zone A':
      return 'Z_A';
    case 'Zone B':
      return 'Z_B';
    case 'Zone C':
      return 'Z_C';
    case 'Zone D':
      return 'Z_D';
    default:
      return 'Z_E';
  }
}

/**
 * Determine shipping zone based on pickup and delivery locations
 */
export function determineZone(
  pickupDetails: PincodeDetails,
  deliveryDetails: PincodeDetails
): { zone: ZonePricing['zone']; zoneName: string } {
  // Same city
  if (pickupDetails.city === deliveryDetails.city) {
    return { zone: 'Z_A', zoneName: ZoneNames.Z_A };
  }

  // Same state
  if (pickupDetails.state === deliveryDetails.state) {
    return { zone: 'Z_B', zoneName: ZoneNames.Z_B };
  }

  // Both metro cities
  if (MetroCities.includes(pickupDetails.city) && MetroCities.includes(deliveryDetails.city)) {
    return { zone: 'Z_C', zoneName: ZoneNames.Z_C };
  }

  // North East states
  if (
    NorthEastStates.includes(pickupDetails.state) ||
    NorthEastStates.includes(deliveryDetails.state)
  ) {
    return { zone: 'Z_E', zoneName: ZoneNames.Z_E };
  }

  // Rest of India
  return { zone: 'Z_D', zoneName: ZoneNames.Z_D };
}

/**
 * Calculate expected pickup time
 */
export function calculateExpectedPickup(pickupTime?: string): string {
  if (!pickupTime) return 'Today';

  try {
    const [hour, minute, second] = pickupTime.split(':').map(Number);
    const now = new Date();
    const pickupDateTime = new Date();
    pickupDateTime.setHours(hour || 12, minute || 0, second || 0, 0);

    return pickupDateTime.getTime() < now.getTime() ? 'Tomorrow' : 'Today';
  } catch {
    return 'Today';
  }
}

export function calculateEstimatedDelivery(estimatedDeliveryDays: number): string {
  const now = new Date();
  const deliveryDate = new Date(now.getTime() + estimatedDeliveryDays * 24 * 60 * 60 * 1000);
  return deliveryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate COD charges
 */
export function calculateCODCharges(
  paymentType: 0 | 1,
  collectableAmount: number = 0,
  codChargeHard: number,
  codChargePercent: number,
  isCodApplicable: boolean
): number {
  if (paymentType !== 1 || !isCodApplicable) return 0;

  const percentageCharge = (codChargePercent / 100) * collectableAmount;
  return Math.max(codChargeHard, percentageCharge);
}

/**
 * Calculate weight increment ratio
 */
export function calculateWeightIncrementRatio(
  orderWeight: number,
  minWeight: number,
  incrementWeight: number
): number {
  if (orderWeight <= minWeight) return 0;
  return Math.ceil((orderWeight - minWeight) / incrementWeight);
}

/**
 * Calculate RTO (Return to Origin) charges
 */
export function calculateRTOCharges(
  isRtoApplicable: boolean,
  zonePricing: ZonePricing,
  baseCharges: number,
  codCharges: number,
  weightIncrementRatio: number
): number {
  if (!isRtoApplicable) return 0;

  if (zonePricing.is_rto_same_as_fw) {
    return Math.max(0, baseCharges - codCharges);
  }

  const rtoBase = zonePricing.rto_base_price || 0;
  const rtoIncrement = (zonePricing.rto_increment_price || 0) * Math.max(0, weightIncrementRatio);

  return rtoBase + rtoIncrement;
}

// ================================
// EXCESS WEIGHT CHARGE HELPER
// ================================

export function calculateExcessCharges(
  weightDiffKg: number,
  courierPricing: CourierPricing,
  zonePricing: ZonePricing
): { fwExcess: number; rtoExcess: number } {
  if (weightDiffKg <= 0) return { fwExcess: 0, rtoExcess: 0 };

  const incrementWeight = courierPricing.increment_weight || 0.5;
  const increments = Math.ceil(weightDiffKg / incrementWeight);

  const fwExcess = (zonePricing.increment_price || 0) * increments;

  let rtoEx = 0;
  if (courierPricing.is_rto_applicable) {
    if (zonePricing.is_rto_same_as_fw) {
      rtoEx = fwExcess;
    } else {
      rtoEx = (zonePricing.rto_increment_price || 0) * increments;
    }
  }

  return { fwExcess: fwExcess, rtoExcess: rtoEx };
}

// ================================
// MAIN CALCULATION FUNCTIONS
// ================================

/**
 * Main function to calculate shipping price for a courier
 */
export function calculatePrice(
  params: PriceCalculationParams,
  courier: CourierInfo,
  courierPricing: CourierPricing,
  pickupDetails: PincodeDetails,
  deliveryDetails: PincodeDetails
): PriceCalculationResult | null {
  try {
    // Validation
    const paramErrors = validateCalculationParams(params);
    const courierErrors = validateCourierData(courier, courierPricing);

    if (paramErrors.length > 0 || courierErrors.length > 0) {
      console.warn('Validation errors:', [...paramErrors, ...courierErrors]);
      return null;
    }

    // Skip inactive couriers
    if (!courier.is_active) return null;

    // Skip couriers that don't match the reversed order flag
    if (courier.is_reversed_courier !== Boolean(params.isReversedOrder)) return null;

    // Weight calculations
    const actualWeight = normalizeWeight(params.weight, params.weightUnit);
    const volumetricWeight = calculateVolumetricWeight(
      params.boxLength,
      params.boxWidth,
      params.boxHeight,
      params.sizeUnit
    );
    const finalWeight = Math.max(volumetricWeight, actualWeight, courier.weight_slab);

    // Determine zone and get zone pricing
    const { zone, zoneName } = determineZone(pickupDetails, deliveryDetails);
    const zonePricing = courierPricing.zone_pricing.find((z) => z.zone === zone);

    if (!zonePricing) return null;

    // Adjust weight based on minimum weight
    const minWeight = courierPricing.weight_slab || 0.5;
    const chargeableWeight = Math.max(finalWeight, minWeight);

    // Calculate weight increment ratio
    const incrementWeight = courierPricing.increment_weight || 0.5;
    const weightIncrementRatio = calculateWeightIncrementRatio(
      chargeableWeight,
      minWeight,
      incrementWeight
    );

    // Calculate base charges
    const basePrice = zonePricing.base_price || 0;
    const weightCharges = (zonePricing.increment_price || 0) * weightIncrementRatio;

    // Calculate COD charges
    const codCharges = calculateCODCharges(
      params.paymentType,
      params.collectableAmount || 0,
      courierPricing.cod_charge_hard || 0,
      courierPricing.cod_charge_percent || 0,
      courierPricing.is_cod_applicable
    );

    // Calculate base total (before RTO)
    const baseTotal = basePrice + weightCharges + codCharges;
    const fw_charge = courierPricing.is_fw_applicable ? basePrice + weightCharges : 0;

    // Calculate RTO charges
    const rtoCharges = calculateRTOCharges(
      courierPricing.is_rto_applicable,
      zonePricing,
      baseTotal,
      codCharges,
      weightIncrementRatio
    );

    // Calculate final total price
    const totalPrice = courierPricing.is_fw_applicable ? baseTotal : 0;

    // Calculate expected pickup
    const expectedPickup = calculateExpectedPickup(courier.pickup_time);

    return {
      courier,
      pricing: courierPricing,
      base_price: basePrice,
      weight_charges: weightCharges,
      cod_charges: codCharges,
      rto_charges: rtoCharges,
      fw_charges: fw_charge,
      total_price: totalPrice,
      final_weight: chargeableWeight,
      volumetric_weight: volumetricWeight,
      zone,
      zoneName,
      expected_pickup: expectedPickup,
      breakdown: {
        actual_weight: actualWeight,
        volumetric_weight: volumetricWeight,
        chargeable_weight: chargeableWeight,
        min_weight: minWeight,
        weight_increment_ratio: weightIncrementRatio,
      },
    };
  } catch (error) {
    console.error(`Error calculating price for courier ${courier.name}:`, error);
    return null;
  }
}

/**
 * Calculate prices for multiple couriers
 */
export function calculatePricesForCouriers(
  params: PriceCalculationParams,
  couriers: CourierWithPricing[],
  pickupDetails: PincodeDetails,
  deliveryDetails: PincodeDetails
): PriceCalculationResult[] {
  const results: PriceCalculationResult[] = [];

  for (const { courier, pricing } of couriers) {
    const result = (calculatePrice(params, courier, pricing, pickupDetails, deliveryDetails));
    if (result) {
      results.push(result);
    }
  }

  return sortByRecommendedAndPrice(results);
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get the cheapest courier option
 */
export function getCheapestOption(
  results: PriceCalculationResult[]
): PriceCalculationResult | null {
  if (results.length === 0) return null;

  return results.reduce((cheapest, current) =>
    current.total_price < cheapest.total_price ? current : cheapest
  );
}

/**
 * Get the most expensive courier option
 */
export function getMostExpensiveOption(
  results: PriceCalculationResult[]
): PriceCalculationResult | null {
  if (results.length === 0) return null;

  return results.reduce((expensive, current) =>
    current.total_price > expensive.total_price ? current : expensive
  );
}

/**
 * Filter results by specific criteria
 */
export function filterResults(
  results: PriceCalculationResult[],
  filters: PriceFilters
): PriceCalculationResult[] {
  return results.filter((result) => {
    // Price range filters
    if (filters.maxPrice !== undefined && result.total_price > filters.maxPrice) return false;
    if (filters.minPrice !== undefined && result.total_price < filters.minPrice) return false;

    // Courier type filter
    if (filters.courierType && result.courier.type !== filters.courierType) return false;

    // COD support filter
    if (
      filters.codSupported !== undefined &&
      result.pricing.is_cod_applicable !== filters.codSupported
    )
      return false;

    // RTO support filter
    if (
      filters.rtoSupported !== undefined &&
      result.pricing.is_rto_applicable !== filters.rtoSupported
    )
      return false;

    // Zone filter
    if (filters.zone && result.zone !== filters.zone) return false;

    // Exclude specific courier IDs
    if (filters.excludeCourierIds && filters.excludeCourierIds.includes(result.courier.id))
      return false;

    return true;
  });
}

/**
 * Sort results by price (ascending or descending)
 */
export function sortByPrice(
  results: PriceCalculationResult[],
  order: 'asc' | 'desc' = 'asc'
): PriceCalculationResult[] {
  return [...results].sort((a, b) =>
    order === 'asc' ? a.total_price - b.total_price : b.total_price - a.total_price
  );
}

/**
 * Sort results by expected pickup time
 */
export function sortByPickupTime(results: PriceCalculationResult[]): PriceCalculationResult[] {
  return [...results].sort((a, b) => {
    if (a.expected_pickup === 'Today' && b.expected_pickup === 'Tomorrow') return -1;
    if (a.expected_pickup === 'Tomorrow' && b.expected_pickup === 'Today') return 1;
    return 0;
  });
}

/**
 * Group results by zone
 */
export function groupByZone(
  results: PriceCalculationResult[]
): Record<string, PriceCalculationResult[]> {
  return results.reduce(
    (groups, result) => {
      const zone = result.zoneName;
      if (!groups[zone]) {
        groups[zone] = [];
      }
      groups[zone].push(result);
      return groups;
    },
    {} as Record<string, PriceCalculationResult[]>
  );
}

/**
 * Get price summary statistics
 */
export function getPriceSummary(results: PriceCalculationResult[]): PriceSummary {
  if (results.length === 0) {
    return {
      totalCouriers: 0,
      serviceable: 0,
      averagePrice: 0,
      priceRange: { min: 0, max: 0 },
    };
  }

  const prices = results.map((r) => r.total_price);
  const sum = prices.reduce((a, b) => a + b, 0);

  return {
    totalCouriers: results.length,
    serviceable: results.length,
    cheapest: getCheapestOption(results) || undefined,
    mostExpensive: getMostExpensiveOption(results) || undefined,
    averagePrice: sum / results.length,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
    },
  };
}

/**
 * Find couriers with COD support
 */
export function getCODSupportedCouriers(
  results: PriceCalculationResult[]
): PriceCalculationResult[] {
  return filterResults(results, { codSupported: true });
}

/**
 * Find couriers with RTO support
 */
export function getRTOSupportedCouriers(
  results: PriceCalculationResult[]
): PriceCalculationResult[] {
  return filterResults(results, { rtoSupported: true });
}

/**
 * Get couriers within a specific price range
 */
export function getCouriersInPriceRange(
  results: PriceCalculationResult[],
  minPrice: number,
  maxPrice: number
): PriceCalculationResult[] {
  return filterResults(results, { minPrice, maxPrice });
}

/**
 * Sort results by recommended couriers first, then by price (ascending)
 */
export function sortByRecommendedAndPrice(
  results: PriceCalculationResult[]
): PriceCalculationResult[] {
  return [...results].sort((a, b) => {
    if (a.courier.recommended === b.courier.recommended) {
      return a.total_price - b.total_price;
    }
    return a.courier.recommended ? -1 : 1;
  });
}
