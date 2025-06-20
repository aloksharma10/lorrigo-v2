import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PlanService } from '../plan/services/plan.service';

export async function setupSellerHooks(fastify: FastifyInstance) {
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    const isRegisterRoute =
      request.method === 'POST' &&
      request.url.includes('/api') &&
      request.url.includes('/auth/register') &&
      !request.url.includes('/login');

    if (!isRegisterRoute) return;

    try {
      if (reply.statusCode < 200 || reply.statusCode >= 300) return;

      let responseData: any = {};
      if (typeof payload === 'string') {
        responseData = JSON.parse(payload);
      } else if (Buffer.isBuffer(payload)) {
        responseData = JSON.parse(payload.toString());
      } else {
        responseData = payload;
      }

      const userId = responseData?.id;
      if (!userId) return;

      const planService = new PlanService(fastify);
      const defaultPlan = await planService.getDefaultPlan();

      if (defaultPlan) {
        await planService.assignPlanToUser(defaultPlan.id, userId);
        fastify.log.info(`Assigned default plan "${defaultPlan.name}" to new seller ${userId}`);
      }
    } catch (err) {
      fastify.log.error('Failed to assign default plan to seller:', err);
    }

    return payload;
  });
}
