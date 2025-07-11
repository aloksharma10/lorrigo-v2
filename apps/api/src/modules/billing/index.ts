import { FastifyInstance } from 'fastify';
import { QueueNames, addRecurringJob } from '@/lib/queue';
import { BillingService } from './services/billing-service';
import { initBillingQueue, BillingJobType } from './queues/billingQueue';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { BillingController } from './controllers/billing-controller';

/**
 * Register the billing module with Fastify
 */
export async function billingRoutes(fastify: FastifyInstance) {
  // Ensure user is authenticated for all billing routes
  fastify.addHook('onRequest', fastify.authenticate);

  const billingService = new BillingService(fastify);
  const { queue } = initBillingQueue(fastify, billingService);

  // Nightly automation – every day at 00:05 AM
  await addRecurringJob(
    QueueNames.BILLING_AUTOMATION,
    BillingJobType.AUTOMATE_BILLING,
    {},
    '5 0 * * *',
    { jobId: 'billing-nightly' }
  );

  // Dispute auto-resolution – run hourly
  await addRecurringJob(
    QueueNames.BILLING_AUTOMATION,
    BillingJobType.RESOLVE_DISPUTES,
    {},
    '0 * * * *',
    { jobId: 'dispute-hourly' }
  );

  // Controller
  const controller = new BillingController(billingService);

  // Admin manual billing generation
  fastify.post(
    '/manual',
    { preHandler: authorizeRoles([Role.ADMIN]) },
    controller.manualBilling.bind(controller)
  );

  // Billing cycles (admin and seller)
  fastify.get(
    '/cycles',
    { preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) },
    controller.getBillingCycles.bind(controller)
  );

  // Billing history
  fastify.get(
    '/history',
    { preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) },
    controller.getBillingHistory.bind(controller)
  );

  // Dispute management
  fastify.get(
    '/disputes',
    { preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) },
    controller.getDisputes.bind(controller)
  );

  fastify.post(
    '/disputes/:id/action',
    { preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) },
    controller.actOnDispute.bind(controller)
  );
} 