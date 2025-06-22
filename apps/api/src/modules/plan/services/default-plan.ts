import { FastifyInstance } from 'fastify';
import { generatePlanId } from '../utils/id-generator';

// Default zone pricing template
const defaultZonePricing = {
  Z_A: {
    base_price: 40,
    increment_price: 10,
    isRTOSameAsFW: true,
    rto_base_price: 0,
    rto_increment_price: 0,
  },
  Z_B: {
    base_price: 50,
    increment_price: 15,
    isRTOSameAsFW: true,
    rto_base_price: 0,
    rto_increment_price: 0,
  },
  Z_C: {
    base_price: 60,
    increment_price: 18,
    isRTOSameAsFW: true,
    rto_base_price: 0,
    rto_increment_price: 0,
  },
  Z_D: {
    base_price: 70,
    increment_price: 20,
    isRTOSameAsFW: true,
    rto_base_price: 0,
    rto_increment_price: 0,
  },
  Z_E: {
    base_price: 100,
    increment_price: 30,
    isRTOSameAsFW: true,
    rto_base_price: 0,
    rto_increment_price: 0,
  },
};

/**
 * Ensures that a default plan exists in the database
 * This should be called during application startup
 */
export async function ensureDefaultPlan(fastify: FastifyInstance) {
  try {
    // Check if a default plan already exists
    const existingDefaultPlan = await fastify.prisma.plan.findFirst({
      where: { isDefault: true },
    });

    if (existingDefaultPlan) {
      console.log('Default plan already exists:', existingDefaultPlan.id);
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
      await fastify.prisma.planCourierPricing.create({
        data: {
          plan_id: defaultPlan.id,
          courier_id: courier.id,
          // base_price: 0, // This is just a placeholder, actual pricing is in zonePricing
          weight_slab: 0.5,
          increment_weight: 0.5,
          increment_price: 0,
          // zonePricing: defaultZonePricing,
        },
      });
    }

    console.log(`Added ${defaultCouriers.length} couriers to default plan`);

    return defaultPlan;
  } catch (error) {
    console.error('Error ensuring default plan:', error);
    throw error;
  }
}
