import { FastifyInstance } from 'fastify';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

import { ShipmentController } from './controllers/shipmentsController';
import { OrderService } from '../orders/services/order-service';
import { ShipmentService } from './services/shipmentService';
import { initShipmentQueue, JobType } from './queues/shipmentQueue';
import { initTrackingScheduler } from './batch/scheduler';
import { addJob, QueueNames } from '@/lib/queue';

export async function shipmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // Initialize services
  const orderService = new OrderService(fastify);
  const shipmentService = new ShipmentService(fastify, orderService);

  // Initialize the shipment queue
  initShipmentQueue(fastify, shipmentService);

  // Initialize the shipment tracking scheduler with optimized configuration
  await initTrackingScheduler(fastify, shipmentService, {
    useCron: true,
    cronPattern: '*/10 * * * *', // Run every 10 minutes
    processor: {
      batchSize: 50,
      concurrency: 5,
      updateFrequency: {
        inTransit: 2,      // Check in-transit shipments every 2 hours
        delivered: 24,     // Check delivered shipments once a day
        rto: 6             // Check RTO shipments every 6 hours
      }
    }
  });
  
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
  fastify.post('/', { 
    preHandler: authorizeRoles([Role.SELLER]) 
  }, shipmentController.createShipment.bind(shipmentController));
  
  fastify.post('/track-batch', { 
    preHandler: authorizeRoles([Role.ADMIN]) 
  }, shipmentController.trackShipmentBatch.bind(shipmentController));
  
  fastify.get<{ Params: { orderId: string } }>('/:orderId/rates', { 
    preHandler: authorizeRoles([Role.SELLER]) 
  }, shipmentController.getRates.bind(shipmentController));
  
  fastify.get<{ Params: { id: string } }>('/:id', { 
    preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) 
  }, shipmentController.getShipmentById.bind(shipmentController));
  
  fastify.post<{ Params: { id: string } }>('/:id/schedule-pickup', { 
    preHandler: authorizeRoles([Role.SELLER]) 
  }, shipmentController.schedulePickup.bind(shipmentController));
  
  fastify.post<{ Params: { id: string } }>('/:id/cancel', { 
    preHandler: authorizeRoles([Role.SELLER]) 
  }, shipmentController.cancelShipment.bind(shipmentController));
  
  fastify.post<{ Params: { id: string } }>('/:id/track', { 
    preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) 
  }, shipmentController.getTrackingEvents.bind(shipmentController));
  
  fastify.get<{ Params: { id: string } }>('/:id/tracking', { 
    preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) 
  }, shipmentController.getTrackingEvents.bind(shipmentController));
  
  fastify.get('/stats', { 
    preHandler: authorizeRoles([Role.SELLER, Role.ADMIN]) 
  }, shipmentController.getShipmentStats.bind(shipmentController));
  
  fastify.get<{ Params: { id: string }; Querystring: { type: string } }>('/download/bulk-operation/:id', { 
    preHandler: authorizeRoles([Role.SELLER]) 
  }, shipmentController.downloadBulkOperationFile.bind(shipmentController));
  
  // Admin routes for managing courier status mappings
  fastify.get('/admin/courier-mappings', { 
    preHandler: authorizeRoles([Role.ADMIN]) 
  }, async (request, reply) => {
    const mappings = await fastify.prisma.courierStatusMapping.findMany({
      orderBy: { courier_name: 'asc' }
    });
    return reply.send(mappings);
  });
  
  fastify.get('/admin/unmapped-statuses', { 
    preHandler: authorizeRoles([Role.ADMIN]) 
  }, async (request, reply) => {
    try {
      // Check if the model exists in the Prisma client
      if ('unmappedCourierStatus' in fastify.prisma) {
        const unmappedStatuses = await (fastify.prisma as any).unmappedCourierStatus.findMany({
          orderBy: [
            { courier: 'asc' },
            { count: 'desc' }
          ]
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
  });
  
  fastify.post('/admin/map-status', { 
    preHandler: authorizeRoles([Role.ADMIN]) 
  }, async (request, reply) => {
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
          is_mapped: true
        }
      });
      
      // Delete from unmapped statuses if it exists
      try {
        if ('unmappedCourierStatus' in fastify.prisma) {
          await (fastify.prisma as any).unmappedCourierStatus.delete({
            where: {
              courier_status_code: {
                courier: courier_name,
                status_code
              }
            }
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
  });
}
