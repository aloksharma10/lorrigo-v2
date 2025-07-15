import { FastifyInstance } from 'fastify';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { RemittanceService } from './remittance-services';
import { RemittanceController } from './remittance-controller';
import { remittanceWorker, RemittanceJobType } from './remittance-job';
import { addRecurringJob, QueueNames } from '@/lib/queue';
import { Queue } from 'bullmq';

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

  // Shared routes (role-based access)
  fastify.get('/remittances', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittances,
  });

  fastify.get('/remittances/:id', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittanceById,
  });

  fastify.get('/analytics', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittanceAnalytics,
  });

  fastify.get('/bank-accounts', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getBankAccounts,
  });

  // Seller-specific routes
  fastify.post('/bank-accounts', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.addBankAccount,
  });

  fastify.post('/bank-accounts/select', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.selectBankAccountForRemittance,
  });

  // Admin-specific routes
  fastify.get('/remittances/future', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getFutureRemittances,
  });

  fastify.post('/remittances/manage', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.manageUserRemittance,
  });

  fastify.put('/bank-accounts/:bankAccountId/verify', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.verifyBankAccount,
  });

  fastify.get('/export/remittances', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.exportRemittances,
  });

  fastify.get('/export/remittance/:id', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.exportRemittanceDetail,
  });
}

export { remittanceWorker };