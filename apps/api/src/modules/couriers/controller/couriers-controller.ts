import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@lorrigo/db';
import { CourierService } from '../services/courier-services';
import { checkAuth } from '@/middleware/auth';

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
  // api_credentials: z
  //   .object({
  //     api_key: z.string().optional(),
  //     api_url: z.string().url().optional(),
  //     username: z.string().optional(),
  //     password: z.string().optional(),
  //     account_number: z.string().optional(),
  //   })
  //   .optional(),
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

export class CourierController {
  constructor(private courierService: CourierService) {}

  async createCourier(request: FastifyRequest, reply: FastifyReply) {
    try {
      const courierData = createCourierSchema.parse(request.body);
      const courier = await this.courierService.createCourier(request.body as any);
      return reply.code(201).send({ courier });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  async getAllCouriers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const userRole = request.userPayload!.role as Role;
      const couriers = await this.courierService.getAllCouriers(userId, userRole);
      return reply.send({ couriers });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  async getCourierById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userPayload!.id;
      const userRole = request.userPayload!.role as Role;

      const courier = await this.courierService.getCourierById(id, userId, userRole);

      if ('error' in courier) {
        return reply.code(courier.status).send({ error: courier.error });
      }

      return reply.send({ courier });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  async updateCourier(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const updateData = updateCourierSchema.parse(request.body);

      const result = await this.courierService.updateCourier(id, updateData);

      if ('error' in result) {
        return reply.code(result.status).send({ error: result.error });
      }

      return reply.send({ result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  async setCourierPricing(request: FastifyRequest, reply: FastifyReply) {
    try {
      const pricingData = courierPricingSchema.parse(request.body);
      const userId = request.userPayload!.id;
      const userRole = request.userPayload!.role as Role;

      const result = await this.courierService.setCourierPricing(pricingData, userId, userRole);

      if ('error' in result) {
        return reply.code(result.status).send({ error: result.error });
      }

      return reply.code(201).send({ result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  async getCourierPricing(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { courierId } = request.params as { courierId: string };
      const userId = request.userPayload!.id;

      const result = await this.courierService.getCourierPricing(courierId, userId);

      if ('error' in result) {
        return reply.code(result.status).send({ error: result.error });
      }

      return reply.send({ result });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }
}
