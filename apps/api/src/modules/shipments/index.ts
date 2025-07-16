import { FastifyInstance } from 'fastify';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

import { ShipmentController } from './controllers/shipmentsController';
import { OrderService } from '../orders/services/order-service';
import { ShipmentService } from './services/shipmentService';
import { initShipmentQueue, JobType } from './queues/shipmentQueue';
// import { initTrackingScheduler } from './batch/scheduler';
import { addJob, QueueNames, addRecurringJob } from '@/lib/queue';

/**
 * Setup optimized tracking automation cron jobs
 */
async function setupOptimizedTrackingCron(fastify: FastifyInstance) {
  try {
    // Main tracking updates every 10 minutes
    await addRecurringJob(
      QueueNames.SHIPMENT_TRACKING,
      JobType.PROCESS_BULK_STATUS_UPDATES,
      { runDate: new Date().toISOString() },
      '*/10 * * * *', // Every 10 minutes
      {
        priority: 1,
        attempts: 3,
        jobId: 'tracking-updates-cron',
      }
    );

    // RTO charges processing every 30 minutes
    await addRecurringJob(
      QueueNames.SHIPMENT_TRACKING,
      JobType.PROCESS_RTO,
      { runDate: new Date().toISOString() },
      '*/30 * * * *', // Every 30 minutes
      {
        priority: 2,
        attempts: 3,
        jobId: 'rto-processing-cron',
      }
    );

    // Cleanup old events daily at 2 AM
    await addRecurringJob(
      QueueNames.SHIPMENT_TRACKING,
      JobType.PROCESS_BULK_TRACKING_EVENTS,
      { runDate: new Date().toISOString() },
      '0 2 * * *', // Daily at 2 AM
      {
        priority: 4,
        attempts: 2,
        jobId: 'cleanup-events-cron',
      }
    );

    fastify.log.info('Optimized tracking automation cron jobs scheduled successfully');
  } catch (error) {
    fastify.log.error(`Failed to setup optimized tracking automation cron: ${error}`);
    throw error;
  }
}

export async function shipmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // Initialize services
  const orderService = new OrderService(fastify);
  const shipmentService = new ShipmentService(fastify, orderService);

  // Initialize the shipment queue
  initShipmentQueue(fastify, shipmentService);

  // Initialize optimized tracking system with cron scheduling
  await setupOptimizedTrackingCron(fastify);

  // Schedule initial bulk processing jobs
  await addJob(
    QueueNames.SHIPMENT_TRACKING,
    JobType.PROCESS_BULK_STATUS_UPDATES,
    { initial: true },
    { delay: 5000 }
  );

  await addJob(
    QueueNames.SHIPMENT_TRACKING,
    JobType.PROCESS_UNMAPPED_STATUSES,
    { initial: true },
    { delay: 10000 }
  );

  await addJob(
    QueueNames.SHIPMENT_TRACKING,
    JobType.PROCESS_EDD_UPDATES,
    { initial: true },
    { delay: 15000 }
  );

  // Create controller instance
  const shipmentController = new ShipmentController(shipmentService);

  // Shipment routes
  fastify.post(
    '/',
    {
      preHandler: authorizeRoles([Role.SELLER]),
    },
    shipmentController.createShipment.bind(shipmentController)
  );

  fastify.post(
    '/track-batch',
    {
      preHandler: authorizeRoles([Role.ADMIN]),
    },
    shipmentController.trackShipmentBatch.bind(shipmentController)
  );

  fastify.get<{ Params: { orderId: string } }>(
    '/:orderId/rates',
    {
      preHandler: authorizeRoles([Role.SELLER]),
    },
    shipmentController.getRates.bind(shipmentController)
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]),
    },
    shipmentController.getShipmentById.bind(shipmentController)
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/schedule-pickup',
    {
      preHandler: authorizeRoles([Role.SELLER]),
    },
    shipmentController.schedulePickup.bind(shipmentController)
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/cancel',
    {
      preHandler: authorizeRoles([Role.SELLER]),
    },
    shipmentController.cancelShipment.bind(shipmentController)
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/track',
    {
      preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]),
    },
    shipmentController.getTrackingEvents.bind(shipmentController)
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id/tracking',
    {
      preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]),
    },
    shipmentController.getTrackingEvents.bind(shipmentController)
  );

  fastify.get(
    '/stats',
    {
      preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]),
    },
    shipmentController.getShipmentStats.bind(shipmentController)
  );

  fastify.get<{ Params: { id: string }; Querystring: { type: string } }>(
    '/download/bulk-operation/:id',
    {
      preHandler: authorizeRoles([Role.SELLER]),
    },
    shipmentController.downloadBulkOperationFile.bind(shipmentController)
  );

  // Admin routes for managing courier status mappings
  fastify.get(
    '/admin/courier-mappings',
    {
      preHandler: authorizeRoles([Role.ADMIN]),
    },
    async (request, reply) => {
      const mappings = await fastify.prisma.courierStatusMapping.findMany({
        orderBy: { courier_name: 'asc' },
      });
      return reply.send(mappings);
    }
  );

  fastify.get(
    '/admin/unmapped-statuses',
    {
      preHandler: authorizeRoles([Role.ADMIN]),
    },
    async (request, reply) => {
      try {
        // Check if the model exists in the Prisma client
        if ('unmappedCourierStatus' in fastify.prisma) {
          const unmappedStatuses = await fastify.prisma.unmappedCourierStatus.findMany({
            orderBy: [{ courier: 'asc' }, { count: 'desc' }],
          });
          return reply.send(unmappedStatuses);
        } else {
          // Return empty array if model doesn't exist yet
          return reply.send([]);
        }
      } catch (error) {
        request.log.error('Error fetching unmapped statuses:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post(
    '/admin/map-status',
    {
      preHandler: authorizeRoles([Role.ADMIN]),
    },
    async (request, reply) => {
      try {
        const { courier_name, status_code, status_label, bucket } = request.body as any;

        // Create new mapping
        const mapping = await fastify.prisma.courierStatusMapping.create({
          data: {
            courier_name,
            status_code,
            status_label,
            bucket,
            is_active: true,
            is_mapped: true,
          },
        });

        // Delete from unmapped statuses if it exists
        try {
          if ('unmappedCourierStatus' in fastify.prisma) {
            await fastify.prisma.unmappedCourierStatus.delete({
              where: {
                courier_status_code: {
                  courier: courier_name,
                  status_code,
                },
              },
            });
          }
        } catch (e) {
          // Ignore if not found
        }

        // Clear Redis cache for this courier
        await fastify.redis.del(`courier:status:mappings:${courier_name}`);

        return reply.send(mapping);
      } catch (error) {
        request.log.error('Error mapping courier status:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Handle NDR event
  fastify.post(
    '/shipments/ndr',
    {
      onRequest: [fastify.authenticate],
    },
    shipmentController.handleNDREvent.bind(shipmentController)
  );

  // Get NDR orders
  fastify.get(
    '/shipments/ndr',
    {
      onRequest: [fastify.authenticate],
    },
    shipmentController.getNDROrders.bind(shipmentController)
  );

  // Take action on NDR order
  fastify.post(
    '/shipments/ndr/:id/action',
    {
      onRequest: [fastify.authenticate],
    },
    shipmentController.takeNDRAction.bind(shipmentController)
  );
}
