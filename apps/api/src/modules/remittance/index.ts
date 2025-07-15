import { FastifyInstance } from 'fastify';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { RemittanceService } from './remittance-services';
import { RemittanceController } from './remittance-controller';
import { remittanceWorker, RemittanceJobType } from './remittance-job';
import { addRecurringJob, QueueNames } from '@/lib/queue';
import { Queue } from 'bullmq';

/**
 * Register the remittance module with Fastify
 */

export async function remittanceRoutes(fastify: FastifyInstance) {
  const remittanceService = new RemittanceService(fastify);
  const remittanceController = new RemittanceController(remittanceService);

  const queue = new Queue(QueueNames.REMITTANCE_PROCESSING, {
    connection: fastify.redis,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  // Nightly automation – every day at 00:05 AM
  await addRecurringJob(
    QueueNames.REMITTANCE_PROCESSING,
    RemittanceJobType.CALCULATE_REMITTANCE,
    {},
    '5 0 * * *',
    { jobId: 'remittance-nightly' }
  );
  // User routes (require authentication)
  fastify.get('/remittance', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.getRemittances,
  });

  fastify.get('/remittance/:id', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.getRemittanceById,
  });

  fastify.get('/remittance/bank-accounts', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.getUserBankAccounts,
  });

  fastify.post('/remittance/bank-accounts', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.addBankAccount,
  });

  fastify.post('/remittance/bank-accounts/select', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.selectBankAccountForRemittance,
  });

  fastify.get('/remittance/analytics', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.getRemittanceAnalytics,
  });

  // Admin routes (require admin authentication)
  fastify.get('/admin/remittance', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getAllRemittances,
  });

  fastify.get('/admin/remittance/future', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getFutureRemittances,
  });

  fastify.get('/admin/remittance/analytics', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittanceAnalytics,
  });

  fastify.post('/admin/remittance/manage', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.manageUserRemittance,
  });

  fastify.get('/admin/bank-accounts', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getAllBankAccounts,
  });

  fastify.put('/admin/bank-accounts/:bankAccountId/verify', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.verifyBankAccount,
  });

  // Export endpoints
  fastify.get('/admin/remittance/export', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.exportRemittances,
  });
  fastify.get('/admin/remittance/:id/export', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.exportRemittanceDetail,
  });
}

export { remittanceWorker };
