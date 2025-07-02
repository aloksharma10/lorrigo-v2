import { FastifyRequest, FastifyReply } from 'fastify';
import { PlanService } from '../services/plan.service';
import { CreatePlanInput, UpdatePlanInput, RateCalculationParams } from '../services/plan.service';

// Define proper input types based on schema
export class PlanController {
  constructor(private planService: PlanService) {}

  async getAllPlans(request: FastifyRequest, reply: FastifyReply) {
    try {
      const plans = await this.planService.getAllPlans();
      return reply.code(200).send({ plans });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch plans' });
    }
  }

  async getPlanById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const plan = await this.planService.getPlanById(id);

      if (!plan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      return reply.code(200).send({ plan });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch plan' });
    }
  }

  async createPlan(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as CreatePlanInput;
      const plan = await this.planService.createPlan(data);
      return reply.code(201).send({ plan });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create plan' });
    }
  }

  async updatePlan(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdatePlanInput;
      const plan = await this.planService.updatePlan(id, data);

      if (!plan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      return reply.code(200).send(plan);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update plan' });
    }
  }

  async deletePlan(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      try {
        const plan = await this.planService.deletePlan(id);

        if (!plan) {
          return reply.code(404).send({ error: 'Plan not found' });
        }

        return reply.code(200).send({ message: 'Plan deleted successfully' });
      } catch (error) {
        if ((error as Error).message === 'Cannot delete plan that is assigned to users') {
          return reply.code(400).send({ error: (error as Error).message });
        }
        throw error;
      }
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete plan' });
    }
  }

  async assignPlanToUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { planId } = request.params as { planId: string };
      const { userId } = request.body as { userId: string };

      const user = await this.planService.assignPlanToUser(planId, userId);

      if (!user) {
        return reply.code(404).send({ error: 'Plan or user not found' });
      }

      return reply.code(200).send({ user });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to assign plan to user' });
    }
  }

  async getDefaultPlan(request: FastifyRequest, reply: FastifyReply) {
    try {
      const plan = await this.planService.getDefaultPlan();

      if (!plan) {
        return reply.code(404).send({ error: 'No default plan found' });
      }

      return reply.code(200).send({ plan });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch default plan' });
    }
  }

  async getUserPlan(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };
      const plan = await this.planService.getUserPlan(userId);

      if (!plan) {
        return reply.code(404).send({ error: 'No plan found for user' });
      }

      return reply.code(200).send({ plan });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch user plan' });
    }
  }

  async getDefaultPlanCourierPricing(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { courierId } = request.params as { courierId: string };
      const pricing = await this.planService.getDefaultPlanCourierPricing(courierId);

      if (!pricing) {
        return reply
          .code(404)
          .send({ error: 'No pricing found for this courier in the default plan' });
      }

      return reply.code(200).send({ pricing });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch default pricing for courier' });
    }
  }

  async calculateRates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.body as RateCalculationParams;
      // Get user ID from authenticated user in request
      const userPayload = request.userPayload;

      if (!userPayload || !userPayload.id) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      const rates = await this.planService.calculateRates(params, userPayload.id);
      return reply.code(200).send({ rates });
    } catch (error) {
      request.log.error(error);
      return reply
        .code(500)
        .send({ error: `Failed to calculate rates: ${(error as Error).message}` });
    }
  }
}
