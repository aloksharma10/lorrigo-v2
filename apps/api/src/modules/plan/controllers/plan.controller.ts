import { FastifyReply, FastifyRequest } from 'fastify';
import { PlanService } from '../services/plan.service';

// Define proper input types based on schema
interface CreatePlanInput {
  name: string;
  description: string;
  isDefault: boolean;
  features: string[];
  courierPricing: Array<{
    courierId: string;
    basePrice: number;
    weightSlab: number;
    incrementWeight: number;
    incrementPrice: number;
    zonePricing: any;
  }>;
}

interface UpdatePlanInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  features?: string[];
  courierPricing?: Array<{
    courierId: string;
    basePrice: number;
    weightSlab: number;
    incrementWeight: number;
    incrementPrice: number;
    zonePricing: any;
  }>;
}

interface CalculateRatesInput {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  weightUnit: 'kg' | 'g';
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  sizeUnit: 'cm' | 'in';
  paymentType: number;
  collectableAmount?: number;
  isReversedOrder?: boolean;
}

export class PlanController {
  constructor(private planService: PlanService) { }

  async getAllPlans(request: FastifyRequest, reply: FastifyReply) {
    try {
      const plans = await this.planService.getAllPlans();
      return reply.code(200).send(plans);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch plans' });
    }
  }

  async getPlanById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const plan = await this.planService.getPlanById(id);
      
      if (!plan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }
      
      return reply.code(200).send(plan);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch plan' });
    }
  }

  async createPlan(request: FastifyRequest, reply: FastifyReply) {
    try {
      const planData = request.body as CreatePlanInput;
      const newPlan = await this.planService.createPlan(planData);
      return reply.code(201).send(newPlan);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create plan' });
    }
  }

  async updatePlan(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const planData = request.body as UpdatePlanInput;
      const updatedPlan = await this.planService.updatePlan(id, planData);
      
      if (!updatedPlan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }
      
      return reply.code(200).send(updatedPlan);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update plan' });
    }
  }

  async deletePlan(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const result = await this.planService.deletePlan(id);
      
      if (!result) {
        return reply.code(404).send({ error: 'Plan not found' });
      }
      
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete plan' });
    }
  }

  async assignPlanToUser(
    request: FastifyRequest<{ Params: { planId: string; userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { planId, userId } = request.params;
      const result = await this.planService.assignPlanToUser(planId, userId);
      
      if (!result) {
        return reply.code(404).send({ error: 'Plan or User not found' });
      }
      
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to assign plan to user' });
    }
  }

  async calculateRates(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const rateParams = request.body as CalculateRatesInput;
      const userId = request.userPayload!.id as string;
      
      const rates = await this.planService.calculateRates(rateParams, userId);
      return reply.code(200).send(rates);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: `Failed to calculate rates: ${(error as Error).message}` });
    }
  }
} 