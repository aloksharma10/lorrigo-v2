import { FastifyInstance } from 'fastify';
import { WeightDisputeController } from './weight-dispute-controller';
import { WeightDisputeService } from './weight-dispute-service';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { initDisputeWorker } from './queues/dispute-worker';
import { addRecurringJob, QueueNames } from '@/lib/queue';
import { DisputeJobType } from './queues/dispute-worker';

export default async function weightDisputeRoutes(fastify: FastifyInstance) {
  const service = new WeightDisputeService(fastify);
  const controller = new WeightDisputeController(service);

  // Start dispute worker (single instance)
  const { disputeWorker } = initDisputeWorker(fastify);

  // Schedule auto-resolve daily at 2:30 AM
  await addRecurringJob(
    QueueNames.DISPUTE_RESOLUTION,
    DisputeJobType.AUTO_RESOLVE,
    { date: new Date().toISOString() },
    '30 2 * * *'
  );

  fastify.addHook('onRequest', fastify.authenticate);

  // List disputes (admin or seller)
  fastify.get('/', controller.listDisputes.bind(controller));

  // Resolve single dispute (seller)
  fastify.put('/:disputeId/resolve', controller.resolveDispute.bind(controller));

  // Bulk action (seller)
  fastify.post('/bulk-action', controller.bulkAction.bind(controller));
} 