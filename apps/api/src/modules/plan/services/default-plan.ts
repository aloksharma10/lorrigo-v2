import { FastifyInstance } from 'fastify';
import { generatePlanId } from '../utils/id-generator';

/**
 * Ensures a default plan exists in the system
 * This should be called during application startup
 */
export async function ensureDefaultPlan(fastify: FastifyInstance) {
  try {
    // Check if a default plan already exists
    const existingDefaultPlan = await fastify.prisma.plan.findFirst({
      where: { isDefault: true }
    });

    if (existingDefaultPlan) {
      console.log('Default plan already exists:', existingDefaultPlan.name);
      return existingDefaultPlan;
    }

    // Create default plan
    const defaultPlan = await fastify.prisma.plan.create({
      data: {
        name: 'Free Plan',
        code: generatePlanId('PL'),
        description: 'Default plan for new users with basic features',
        isDefault: true,
        features: [
          'Limited courier selection',
          'Basic shipping rates',
          'Standard support'
        ]
      }
    });

    console.log('Created default plan:', defaultPlan.name);

    // Get default couriers for the free plan
    const defaultCouriers = await fastify.prisma.courier.findMany({
      where: {
        is_active: true
      },
      take: 2 // Limit to 2 couriers for free plan
    });

    // Create pricing for each courier
    for (const courier of defaultCouriers) {
      await fastify.prisma.planCourierPricing.create({
        data: {
          planId: defaultPlan.id,
          courierId: courier.id,
          basePrice: 50, // Default base price
          weightSlab: 0.5,
          incrementWeight: 0.5,
          incrementPrice: 10,
          zonePricing: {
            withinCity: {
              basePrice: 40,
              incrementPrice: 8,
              isRTOSameAsFW: true
            },
            withinZone: {
              basePrice: 50,
              incrementPrice: 10,
              isRTOSameAsFW: true
            },
            withinMetro: {
              basePrice: 60,
              incrementPrice: 12,
              isRTOSameAsFW: true
            },
            withinRoi: {
              basePrice: 80,
              incrementPrice: 15,
              isRTOSameAsFW: true
            },
            northEast: {
              basePrice: 100,
              incrementPrice: 20,
              isRTOSameAsFW: true
            }
          }
        }
      });
    }

    console.log(`Added ${defaultCouriers.length} couriers to default plan`);
    return defaultPlan;
  } catch (error) {
    console.error('Error creating default plan:', error);
    throw error;
  }
} 