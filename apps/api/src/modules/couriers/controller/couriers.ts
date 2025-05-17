import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  authenticateUser, 
  authorizeRoles, 
  authorizePermissions 
} from '../../../middleware/auth';
import { Role } from '@lorrigo/db';

// Validation schemas
const createCourierSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  courier_code: z.string(),
  website: z.string().url().optional(),
  is_active: z.boolean().default(true),
  is_reversed_courier: z.boolean().default(false),
  is_fw_applicable: z.boolean().default(true),
  is_rto_applicable: z.boolean().default(true),
  is_cod_applicable: z.boolean().default(true),
  is_cod_reversal_applicable: z.boolean().default(true),
  cod_charge_hard: z.number().optional().default(40),
  cod_charge_percent: z.number().optional().default(1.5),
  weight_slab: z.number().optional(),
  weight_unit: z.string().optional(),
  increment_weight: z.number().optional(),
  type: z.enum(['EXPRESS', 'SURFACE']).default('SURFACE'),
  pickup_time: z.string().optional(),
  api_credentials: z.object({
    api_key: z.string().optional(),
    api_url: z.string().url().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    account_number: z.string().optional(),
  }).optional(),
});

const updateCourierSchema = createCourierSchema.partial();

const courierPricingSchema = z.object({
  courier_id: z.string(),
  base_price: z.number().positive(),
  weight_slab: z.number().positive(),
  zone_pricing: z.number().positive(),
  cod_charge_hard: z.number().positive(),
  cod_charge_percent: z.number().positive(),
});

// Admin roles that can manage couriers
const ADMIN_ROLES = [Role.ADMIN, Role.SUBADMIN];

// Route definitions
export default async function courierRoutes(fastify: FastifyInstance) {
  // Create a new courier (Admin only)
  fastify.post('/', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    handler: async (request, reply) => {
      try {
        const courierData = createCourierSchema.parse(request.body);

        // Check if courier code already exists
        const existingCourier = await fastify.prisma.courier.findUnique({
          where: { code: courierData.code },
        });

        if (existingCourier) {
          return reply.code(409).send({ error: 'Courier with this code already exists' });
        }

        // Create the courier
        const courier = await fastify.prisma.courier.create({
          data: {
            name: courierData.name,
            code: courierData.code,
            courier_code: courierData.courier_code,
            is_active: courierData.is_active,
            is_reversed_courier: courierData.is_reversed_courier,
            is_fw_applicable: courierData.is_fw_applicable,
            is_rto_applicable: courierData.is_rto_applicable,
            is_cod_applicable: courierData.is_cod_applicable,
            is_cod_reversal_applicable: courierData.is_cod_reversal_applicable,
            cod_charge_hard: courierData.cod_charge_hard,
            cod_charge_percent: courierData.cod_charge_percent,
            weight_slab: courierData.weight_slab,
            weight_unit: courierData.weight_unit,
            increment_weight: courierData.increment_weight,
            type: courierData.type,
            pickup_time: courierData.pickup_time,
            api_credentials: courierData.api_credentials,
          },
        });

        return reply.code(201).send(courier);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Get all active couriers (All authenticated users)
  fastify.get('/', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        // If not an admin, only show couriers available to the specific seller
        if (!ADMIN_ROLES.includes(request.user.role as any)) {
          const userId = request.user.id;
          
          // Get all courier pricings for this user
          const courierPricings = await fastify.prisma.courierPricing.findMany({
            where: {
              user_id: userId,
            },
            select: {
              courier_id: true,
            },
          });
          
          const courierIds = courierPricings.map(pricing => pricing.courier_id);
          
          const couriers = await fastify.prisma.courier.findMany({
            where: {
              id: { in: courierIds },
              is_active: true,
            },
            orderBy: {
              name: 'asc',
            },
          });
          
          return reply.send(couriers);
        }
        
        // For admins, show all couriers
        const couriers = await fastify.prisma.courier.findMany({
          where: {
            is_active: true,
          },
          orderBy: {
            name: 'asc',
          },
        });

        return reply.send(couriers);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Get a specific courier
  fastify.get('/:id', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        const courier = await fastify.prisma.courier.findUnique({
          where: { id },
        });

        if (!courier) {
          return reply.code(404).send({ error: 'Courier not found' });
        }

        // If not an admin, check if this courier is available to the user
        if (!ADMIN_ROLES.includes(request.user.role as any)) {
          const pricing = await fastify.prisma.courierPricing.findFirst({
            where: {
              user_id: userId,
              courier_id: id,
            },
          });

          if (!pricing) {
            return reply.code(403).send({ error: 'You do not have access to this courier' });
          }
        }

        return reply.send(courier);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Update a courier (Admin only)
  fastify.patch('/:id', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updateData = updateCourierSchema.parse(request.body);

        // Check if courier exists
        const existingCourier = await fastify.prisma.courier.findUnique({
          where: { id },
        });

        if (!existingCourier) {
          return reply.code(404).send({ error: 'Courier not found' });
        }

        // If code is being updated, check if it conflicts with another courier
        if (updateData.code && updateData.code !== existingCourier.code) {
          const codeConflict = await fastify.prisma.courier.findUnique({
            where: { code: updateData.code },
          });

          if (codeConflict) {
            return reply.code(409).send({ error: 'Courier with this code already exists' });
          }
        }

        // Update the courier
        const updatedCourier = await fastify.prisma.courier.update({
          where: { id },
          data: updateData,
        });

        return reply.send(updatedCourier);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Set courier pricing for a user
  fastify.post('/pricing', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const pricingData = courierPricingSchema.parse(request.body);
        const userId = request.user.id;

        // Check if courier exists
        const courier = await fastify.prisma.courier.findUnique({
          where: { id: pricingData.courier_id },
        });

        if (!courier) {
          return reply.code(404).send({ error: 'Courier not found' });
        }

        // Only admins can set pricing for others, or users can set their own
        if (!ADMIN_ROLES.includes(request.user.role as any) && userId !== request.user.id) {
          return reply.code(403).send({ error: 'You do not have permission to set pricing for other users' });
        }

        // Check if pricing already exists for this user and courier
        const existingPricing = await fastify.prisma.courierPricing.findFirst({
          where: {
            user_id: userId,
            courier_id: pricingData.courier_id,
          },
        });

        let pricing;

        if (existingPricing) {
          // Update existing pricing
          pricing = await fastify.prisma.courierPricing.update({
            where: { id: existingPricing.id },
            data: {
              base_price: pricingData.base_price,
              weight_slab: pricingData.weight_slab,
              zone_pricing: pricingData.zone_pricing,
            },
          });
        } else {
          // Create new pricing
          pricing = await fastify.prisma.courierPricing.create({
            data: {
              code: `CP-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
              user_id: userId,
              courier_id: pricingData.courier_id,
              base_price: pricingData.base_price,
              weight_slab: pricingData.weight_slab,
              zone_pricing: pricingData.zone_pricing,
            },
          });
        }

        return reply.code(201).send(pricing);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  });

  // Get courier pricing for a user
  fastify.get('/pricing/:courierId', async (request, reply) => {
    try {
      const { courierId } = request.params as { courierId: string };
      const userId = request.user.id;

      // Check if courier exists
      const courier = await fastify.prisma.courier.findUnique({
        where: { id: courierId },
      });

      if (!courier) {
        return reply.code(404).send({ error: 'Courier not found' });
      }

      // Get pricing for this user and courier
      const pricing = await fastify.prisma.courierPricing.findFirst({
        where: {
          user_id: userId,
          courier_id: courierId,
        },
      });

      if (!pricing) {
        return reply.code(404).send({ error: 'Pricing not found for this courier' });
      }

      return reply.send(pricing);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Calculate shipping cost
  // fastify.post('/calculate', async (request, reply) => {
  //   try {
  //     const { courierId, weight, dimensions } = request.body as {
  //       courierId: string;
  //       weight: number;
  //       dimensions?: { length: number; width: number; height: number; }
  //     };

  //     const userId = request.user.id;

  //     // Check if courier exists
  //     const courier = await fastify.prisma.courier.findUnique({
  //       where: { id: courierId },
  //     });

  //     if (!courier) {
  //       return reply.code(404).send({ error: 'Courier not found' });
  //     }

  //     // Get pricing for this user and courier
  //     const pricing = await fastify.prisma.courierPricing.findFirst({
  //       where: {
  //         userId,
  //         courierId,
  //       },
  //     });

  //     if (!pricing) {
  //       return reply.code(404).send({ error: 'Pricing not found for this courier' });
  //     }

  //     // Calculate shipping cost
  //     let cost = pricing.basePrice + (weight * pricing.pricePerKg);

  //     // Apply rules based on weight if applicable
  //     if (pricing.rules && Array.isArray(pricing.rules)) {
  //       for (const rule of pricing.rules) {
  //         if (weight >= rule.minWeight && (!rule.maxWeight || weight <= rule.maxWeight)) {
  //           cost = rule.price;
  //           break;
  //         }
  //       }
  //     }

  //     // Apply additional charges
  //     if (pricing.additionalCharges && Array.isArray(pricing.additionalCharges)) {
  //       for (const charge of pricing.additionalCharges) {
  //         if (charge.isPercentage) {
  //           cost += cost * (charge.amount / 100);
  //         } else {
  //           cost += charge.amount;
  //         }
  //       }
  //     }

  //     return reply.send({
  //       cost,
  //       courier: {
  //         id: courier.id,
  //         name: courier.name,
  //         code: courier.code
  //       },
  //       weight,
  //       dimensions
  //     });
  //   } catch (error) {
  //     request.log.error(error);
  //     return reply.code(500).send({ error: 'Internal Server Error' });
  //   }
  // });
} 