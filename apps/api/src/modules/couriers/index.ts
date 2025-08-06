import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { CourierController } from './controller/couriers-controller';
import { CourierService } from './services/courier-services';

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
  api_credentials: z
    .object({
      api_key: z.string().optional(),
      api_url: z.string().url().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      account_number: z.string().optional(),
    })
    .optional(),
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
  // Initialize services and controllers
  const courierService = new CourierService(fastify);
  const courierController = new CourierController(courierService);

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Create a new courier (Admin only)
  fastify.post('/', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    handler: (request, reply) => courierController.createCourier(request, reply),
  });

  // Get all active couriers (All authenticated users)
  fastify.get('/', {
    handler: (request, reply) => courierController.getAllCouriers(request, reply),
  });

  // Get a specific courier
  fastify.get('/:id', {
    handler: (request, reply) => courierController.getCourierById(request, reply),
  });

  // Update a courier (Admin only)
  fastify.patch('/:id', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    handler: (request, reply) => courierController.updateCourier(request, reply),
  });

  // Set courier pricing for a user
  fastify.post('/pricing', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    handler: (request, reply) => courierController.setCourierPricing(request, reply),
  });

  // Get courier pricing for a user
  fastify.get('/pricing/:courierId', {
    handler: (request, reply) => courierController.getCourierPricing(request, reply),
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
