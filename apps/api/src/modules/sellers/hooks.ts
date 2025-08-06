import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PlanService } from '../plan/services/plan.service';

export async function setupSellerHooks(fastify: FastifyInstance) {
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Check if this is an authentication route that should trigger default plan assignment
    const isAuthRoute = 
      request.url.includes('/api') && 
      (
        // Regular registration (POST)
        (request.method === 'POST' && request.url.includes('/auth/register') && !request.url.includes('/login')) ||
        // Google OAuth login (POST)
        (request.method === 'POST' && request.url.includes('/auth/login/google')) ||
        // Shopify OAuth callback (GET)
        (request.method === 'GET' && request.url.includes('/auth/shopify/callback')) ||
        // Passkey authentication (POST)
        (request.method === 'POST' && request.url.includes('/auth/passkey/authenticate/verify'))
      );

    if (!isAuthRoute) return;

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

      // Extract user ID from different response formats
      let userId: string | undefined;
      
      if (responseData?.id) {
        // Regular registration response format
        userId = responseData.id;
      } else if (responseData?.user?.id) {
        // OAuth login response format
        userId = responseData.user.id;
      } else if (responseData?.success && responseData?.user?.id) {
        // Passkey authentication response format
        userId = responseData.user.id;
      }

      if (!userId) {
        fastify.log.debug('No user ID found in response for default plan assignment');
        return;
      }

      // Check if user already has a plan assigned
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { plan_id: true }
      });

      if (!user) {
        fastify.log.warn(`User ${userId} not found when checking plan assignment`);
        return;
      }

      // If user already has a plan, don't assign default
      if (user.plan_id) {
        fastify.log.debug(`User ${userId} already has plan ${user.plan_id} assigned`);
        return;
      }

      // User doesn't have a plan, assign default plan
      const planService = new PlanService(fastify);
      const defaultPlan = await planService.getDefaultPlan();

      if (defaultPlan) {
        await planService.assignPlanToUser(defaultPlan.id, userId);
        fastify.log.info(`Assigned default plan "${defaultPlan.name}" to user ${userId} via ${request.url}`);
      } else {
        fastify.log.warn('No default plan found to assign to user');
      }
    } catch (err) {
      fastify.log.error('Failed to assign default plan to user:', err);
    }

    return payload;
  });
}
