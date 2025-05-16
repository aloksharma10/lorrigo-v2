import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';

// Validation schemas
const createCourierSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
  supportedCountries: z.array(z.string()).optional(),
  apiConfig: z.object({
    apiKey: z.string().optional(),
    apiUrl: z.string().url().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    accountNumber: z.string().optional(),
  }).optional(),
});

const updateCourierSchema = createCourierSchema.partial();

const courierPricingSchema = z.object({
  courierId: z.string(),
  basePrice: z.number().positive(),
  pricePerKg: z.number().positive(),
  rules: z.array(z.object({
    minWeight: z.number().positive(),
    maxWeight: z.number().positive().optional(),
    price: z.number().positive(),
  })).optional(),
  additionalCharges: z.array(z.object({
    name: z.string(),
    amount: z.number().positive(),
    isPercentage: z.boolean().default(false),
  })).optional(),
});

// Route definitions
export default async function courierRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticateUser);

  // Create a new courier
  fastify.post('/', async (request, reply) => {
    try {
      const courierData = createCourierSchema.parse(request.body);
      
      // Only admin users can create couriers
      if (request.user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Only administrators can create couriers' });
      }
      
      // Check if courier code already exists
      const existingCourier = await fastify.prisma.courier.findUnique({
        where: { code: courierData.code },
      });
      
      if (existingCourier) {
        return reply.code(409).send({ error: 'Courier with this code already exists' });
      }
      
      // Create the courier
      const courier = await fastify.prisma.courier.create({
        data: courierData,
      });
      
      return reply.code(201).send(courier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get all couriers
  fastify.get('/', async (request, reply) => {
    try {
      const couriers = await fastify.prisma.courier.findMany({
        where: {
          isActive: true,
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
  });

  // Get a specific courier
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const courier = await fastify.prisma.courier.findUnique({
        where: { id },
      });
      
      if (!courier) {
        return reply.code(404).send({ error: 'Courier not found' });
      }
      
      return reply.send(courier);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Update a courier
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updateData = updateCourierSchema.parse(request.body);
      
      // Only admin users can update couriers
      if (request.user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Only administrators can update couriers' });
      }
      
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
  });

  // Set courier pricing for a user
  fastify.post('/pricing', async (request, reply) => {
    try {
      const pricingData = courierPricingSchema.parse(request.body);
      const userId = request.user.id;
      
      // Check if courier exists
      const courier = await fastify.prisma.courier.findUnique({
        where: { id: pricingData.courierId },
      });
      
      if (!courier) {
        return reply.code(404).send({ error: 'Courier not found' });
      }
      
      // Check if pricing already exists for this user and courier
      const existingPricing = await fastify.prisma.courierPricing.findFirst({
        where: {
          userId,
          courierId: pricingData.courierId,
        },
      });
      
      let pricing;
      
      if (existingPricing) {
        // Update existing pricing
        pricing = await fastify.prisma.courierPricing.update({
          where: { id: existingPricing.id },
          data: {
            basePrice: pricingData.basePrice,
            pricePerKg: pricingData.pricePerKg,
            rules: pricingData.rules,
            additionalCharges: pricingData.additionalCharges,
          },
        });
      } else {
        // Create new pricing
        pricing = await fastify.prisma.courierPricing.create({
          data: {
            basePrice: pricingData.basePrice,
            pricePerKg: pricingData.pricePerKg,
            rules: pricingData.rules,
            additionalCharges: pricingData.additionalCharges,
            user: {
              connect: { id: userId },
            },
            courier: {
              connect: { id: pricingData.courierId },
            },
          },
        });
      }
      
      return reply.code(existingPricing ? 200 : 201).send(pricing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
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
          userId,
          courierId,
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
  fastify.post('/calculate', async (request, reply) => {
    try {
      const { courierId, weight, dimensions } = request.body as { 
        courierId: string;
        weight: number;
        dimensions?: { length: number; width: number; height: number; }
      };
      
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
          userId,
          courierId,
        },
      });
      
      if (!pricing) {
        return reply.code(404).send({ error: 'Pricing not found for this courier' });
      }
      
      // Calculate shipping cost
      let cost = pricing.basePrice + (weight * pricing.pricePerKg);
      
      // Apply rules based on weight if applicable
      if (pricing.rules && Array.isArray(pricing.rules)) {
        for (const rule of pricing.rules) {
          if (weight >= rule.minWeight && (!rule.maxWeight || weight <= rule.maxWeight)) {
            cost = rule.price;
            break;
          }
        }
      }
      
      // Apply additional charges
      if (pricing.additionalCharges && Array.isArray(pricing.additionalCharges)) {
        for (const charge of pricing.additionalCharges) {
          if (charge.isPercentage) {
            cost += cost * (charge.amount / 100);
          } else {
            cost += charge.amount;
          }
        }
      }
      
      return reply.send({ 
        cost,
        courier: {
          id: courier.id,
          name: courier.name,
          code: courier.code
        },
        weight,
        dimensions
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
} 