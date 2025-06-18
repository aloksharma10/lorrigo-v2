export function normalizeCourierRate(rate: any) {
  const { courier, pricing, breakdown } = rate;

  return {
    courierId: courier.id,
    courierName: courier.name,
    courierNickname: courier.nickname,
    courierCode: courier.courier_code,
    type: courier.type,
    rating: courier.rating,
    pickupPerformance: courier.pickup_performance,
    deliveryPerformance: courier.delivery_performance,
    rtoPerformance: courier.rto_performance,
    etd: courier.etd,
    edd: parseInt(courier.estimated_delivery_days, 10),
    expectedPickup: rate.expected_pickup,

    zone: rate.zone,
    zoneName: rate.zoneName,

    pricing: {
      basePrice: rate.base_price,
      weightCharges: rate.weight_charges,
      codCharges: rate.cod_charges,
      rtoCharges: rate.rto_charges,
      fwCharges: rate.fw_charges,
      totalPrice: rate.total_price,
      pricing: rate.pricing,
    },

    weightDetails: {
      actual: breakdown.actual_weight,
      volumetric: breakdown.volumetric_weight,
      chargeable: breakdown.chargeable_weight,
      min: breakdown.min_weight,
      weightIncrementRatio: breakdown.weight_increment_ratio,
      finalWeight: rate.final_weight,
    },

    cod: {
      hardCharge: pricing.cod_charge_hard,
      percentCharge: pricing.cod_charge_percent,
      isApplicable: pricing.is_cod_applicable,
    },

    rtoApplicable: pricing.is_rto_applicable,
    fwApplicable: pricing.is_fw_applicable,
    codApplicable: pricing.is_cod_applicable,
    codReversalApplicable: pricing.is_cod_reversal_applicable,
  };
}
