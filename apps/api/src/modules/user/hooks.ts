import { FastifyInstance } from 'fastify';
import { PlanService } from '../plan/services/plan.service';

/**
 * Hook to assign default plan to new users upon signup
 * @param fastify Fastify instance
 */
export async function setupUserHooks(fastify: FastifyInstance) {
  // Register hook for user creation
  fastify.addHook('onRequest', async (request, reply) => {
    // Only intercept user creation requests
    if (
      request.method === 'POST' &&
      request.url.includes('/api/users') &&
      !request.url.includes('/login') &&
      !request.url.includes('/auth')
    ) {
      // Store original handler
      const originalHandler = request.routeHandler;

      // Override handler
      request.routeHandler = async function (this: any, req: any, res: any) {
        // Call original handler first
        await originalHandler.call(this, req, res);

        // If user was created successfully
        if (res.statusCode >= 200 && res.statusCode < 300 && res.payload) {
          try {
            // Parse response to get the user ID
            const responseData = JSON.parse(res.payload);
            const userId = responseData.id;

            if (userId) {
              // Get default plan
              const planService = new PlanService(fastify);
              const defaultPlan = await planService.getDefaultPlan();

              if (defaultPlan) {
                // Assign default plan to user
                await planService.assignPlanToUser(defaultPlan.id, userId);
                fastify.log.info(
                  `Assigned default plan "${defaultPlan.name}" to new user ${userId}`
                );
              }
            }
          } catch (error) {
            fastify.log.error('Failed to assign default plan to new user:', error);
          }
        }
      };
    }
  });
}
