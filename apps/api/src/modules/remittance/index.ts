import { FastifyInstance } from 'fastify';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { RemittanceService } from './remittance-services';
import { RemittanceController } from './remittance-controller';
import { remittanceWorker, RemittanceJobType } from './remittance-job';
import { addRecurringJob, QueueNames } from '@/lib/queue';
import { Queue } from 'bullmq';

export async function remittanceRoutes(fastify: FastifyInstance) {

  fastify.addHook('onRequest', fastify.authenticate);

  const remittanceService = new RemittanceService(fastify);
  const remittanceController = new RemittanceController(remittanceService);

  // await remittanceService.calculateRemittanceForAllUsers()

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
  fastify.get('/', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittances.bind(remittanceController),
  });

  fastify.get('/:id', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittanceById.bind(remittanceController),
  });

  fastify.get('/analytics', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getRemittanceAnalytics.bind(remittanceController),
  });

  fastify.get('/bank-accounts', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getBankAccounts.bind(remittanceController),
  });

  // Seller-specific routes
  // fastify.post('/bank-accounts', {
  //   preHandler: [authorizeRoles([Role.SELLER])],
  //   handler: remittanceController.addBankAccount.bind(remittanceController),
  // });

  fastify.post('/bank-accounts/select', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: remittanceController.selectBankAccountForRemittance.bind(remittanceController),
  });

  // Admin-specific routes
  fastify.get('/future', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.getFutureRemittances.bind(remittanceController),
  });

  fastify.post('/manage', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.manageUserRemittance.bind(remittanceController),
  });

  fastify.put('/bank-accounts/:bankAccountId/verify', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.verifyBankAccount.bind(remittanceController),
  });

  fastify.get('/export', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.exportRemittances.bind(remittanceController),
  });

  fastify.get('/export/:id', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    handler: remittanceController.exportRemittanceDetail.bind(remittanceController),
  });
}

export { remittanceWorker };