import { FastifyInstance } from 'fastify';
import { BillingController } from './controllers/billing-controller';
import { BillingService } from './services/billing-service';
import { initBillingWorker } from './queues/billing-worker';
import { authorizeRoles, authenticateUser } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

/**
 * Billing module routes
 */
export default async function billingRoutes(fastify: FastifyInstance) {
  const billingService = new BillingService(fastify);
  const billingController = new BillingController(billingService);

  // Initialize billing worker
  const { billingWorker } = initBillingWorker(fastify);

  // Admin-only routes for billing management
  fastify.register(async function (fastify) {
    fastify.addHook('onRequest', fastify.authenticate);
    const adminOnly = authorizeRoles([Role.ADMIN])

    // CSV Upload for billing
    fastify.post('/upload-csv', {
      preHandler: [adminOnly]
    }, billingController.uploadBillingCSV.bind(billingController));

    // Manual billing routes
    fastify.post('/manual/:userId', {
      preHandler: [adminOnly]
    }, billingController.processManualBilling.bind(billingController));

    // Billing cycle management
    fastify.post('/cycle/:userId', {
      preHandler: [adminOnly]
    }, billingController.createBillingCycle.bind(billingController));

    // Get billing summary by month (Admin view)
    fastify.get('/summary/:month', {
      preHandler: [adminOnly]
    }, billingController.getBillingSummaryByMonth.bind(billingController));

    // Get user billing details by month (Admin accessing user data)
    fastify.get('/user/:userId/:month', {
      preHandler: [adminOnly]
    }, billingController.getUserBillingByMonth.bind(billingController));

    // Get bulk operation status
    fastify.get('/operation/:operationId', {
      preHandler: [adminOnly]
    }, billingController.getBulkOperationStatus.bind(billingController));
  });

  // User-accessible routes
  fastify.register(async function (fastify) {
    fastify.addHook('onRequest', fastify.authenticate);
    const sellerOnly = authorizeRoles([Role.SELLER])

    // Get user's own billing details for a month
    fastify.get('/my/:month', {
      preHandler: [sellerOnly]
    },
      billingController.getUserBillingByMonth.bind(billingController)
    );

    // Get available billing months
    fastify.get('/months', {
      preHandler: [sellerOnly]
    },
      billingController.getAvailableBillingMonths.bind(billingController)
    );
  });

  // Health check for billing worker
  fastify.get('/worker/health', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Check billing worker health',
      security: [{ bearerAuth: [] }]
    },
    handler: async (request, reply) => {
      try {
        const queueHealth = await billingWorker.isRunning();
        return reply.code(200).send({
          success: true,
          data: {
            workerRunning: queueHealth,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Failed to check worker health',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },
  });
} 