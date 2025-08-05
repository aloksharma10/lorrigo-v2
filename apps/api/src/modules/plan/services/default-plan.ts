import { FastifyInstance } from 'fastify';
import { generatePlanId } from '../utils/id-generator';
import { ZoneLabel } from '@lorrigo/db';

// Default zone pricing template
const defaultZonePricing = [
  {
    zone: ZoneLabel.Z_A,
    base_price: 40,
    increment_price: 10,
    is_rto_same_as_fw: true,
    rto_base_price: 0,
    rto_increment_price: 0,
    flat_rto_charge: 0,
  },
  {
    zone: ZoneLabel.Z_B,
    base_price: 50,
    increment_price: 15,
    is_rto_same_as_fw: true,
    rto_base_price: 0,
    rto_increment_price: 0,
    flat_rto_charge: 0,
  },
  {
    zone: ZoneLabel.Z_C,
    base_price: 60,
    increment_price: 18,
    is_rto_same_as_fw: true,
    rto_base_price: 0,
    rto_increment_price: 0,
    flat_rto_charge: 0,
  },
  {
    zone: ZoneLabel.Z_D,
    base_price: 70,
    increment_price: 20,
    is_rto_same_as_fw: true,
    rto_base_price: 0,
    rto_increment_price: 0,
    flat_rto_charge: 0,
  },
  {
    zone: ZoneLabel.Z_E,
    base_price: 100,
    increment_price: 30,
    is_rto_same_as_fw: true,
    rto_base_price: 0,
    rto_increment_price: 0,
    flat_rto_charge: 0,
  },
];

/**
 * Ensures that a default plan exists in the database
 * This should be called during application startup
 */
export async function ensureDefaultPlan(fastify: FastifyInstance) {
  try {
    // Check if a default plan already exists
    const existingDefaultPlan = await fastify.prisma.plan.findFirst({
      where: { isDefault: true },
      include: {
        plan_courier_pricings: {
          include: {
            zone_pricing: true,
          },
        },
      },
    });

    if (existingDefaultPlan) {
      console.log('Default plan already exists:', existingDefaultPlan.id);

      // Check if zone pricing exists for the default plan
      const hasZonePricing = existingDefaultPlan.plan_courier_pricings.some((pricing) => pricing.zone_pricing.length > 0);

      if (!hasZonePricing) {
        console.log('Default plan exists but missing zone pricing, updating...');

        // Add zone pricing to existing courier pricings
        for (const courierPricing of existingDefaultPlan.plan_courier_pricings) {
          await fastify.prisma.zonePricing.createMany({
            data: defaultZonePricing.map((zone) => ({
              ...zone,
              plan_courier_pricing_id: courierPricing.id,
            })),
          });
        }

        console.log('Added zone pricing to existing default plan');
      }

      return existingDefaultPlan;
    }

    // Create default plan
    const defaultPlan = await fastify.prisma.plan.create({
      data: {
        name: 'Free Plan',
        code: generatePlanId('PL'),
        description: 'Default plan for all users',
        isDefault: true,
        features: ['Limited courier selection', 'Basic shipping rates', 'Standard support'],
      },
    });

    console.log('Created default plan:', defaultPlan.id);

    // Get default couriers for the free plan
    const defaultCouriers = await fastify.prisma.courier.findMany({
      where: {
        is_active: true,
      },
      take: 3, // Limit to 3 couriers for the free plan
    });

    // Create pricing for each courier
    for (const courier of defaultCouriers) {
      const courierPricing = await fastify.prisma.planCourierPricing.create({
        data: {
          plan_id: defaultPlan.id,
          courier_id: courier.id,
          cod_charge_hard: 40,
          cod_charge_percent: 1.5,
          is_fw_applicable: true,
          is_rto_applicable: true,
          is_cod_applicable: true,
          is_cod_reversal_applicable: true,
          weight_slab: 0.5,
          increment_weight: 0.5,
          increment_price: 0,
        },
      });

      // Create zone pricing for this courier
      await fastify.prisma.zonePricing.createMany({
        data: defaultZonePricing.map((zone) => ({
          ...zone,
          plan_courier_pricing_id: courierPricing.id,
        })),
      });
    }

    console.log(`Added ${defaultCouriers.length} couriers with zone pricing to default plan`);

    return defaultPlan;
  } catch (error) {
    console.error('Error ensuring default plan:', error);
    throw error;
  }
}
