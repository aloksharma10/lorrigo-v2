import { FastifyInstance } from 'fastify';
import { ShipmentController } from './controllers/shipmentsController';
import { ShipmentService } from './services/shipmentService';
import { OrderService } from '../orders/services/order-service';
import { checkAuth } from '../../middleware/auth';

export async function shipmentRoutes(fastify: FastifyInstance) {
  // Initialize services and controllers
  fastify.addHook('onRequest', fastify.authenticate);


  const orderService = new OrderService(fastify);
  const shipmentService = new ShipmentService(fastify, orderService);
  const shipmentController = new ShipmentController(shipmentService);

  // Add auth preHandler to all routes
  const preHandler = [checkAuth];

  // Shipment rates
  fastify.get<{ Params: { id: string } }>(
    '/:id/rates',
    { preHandler },
    shipmentController.getRates.bind(shipmentController)
  );

  // Single shipment operations
  fastify.post(
    '',
    { preHandler },
    shipmentController.createShipment.bind(shipmentController)
  );

  fastify.get(
    '',
    { preHandler },
    shipmentController.getAllShipments.bind(shipmentController)
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler },
    shipmentController.getShipmentById.bind(shipmentController)
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/schedule-pickup',
    { preHandler },
    (request, reply) => {
      const { pickupDate } = request.body as { pickupDate: string };
      const { id } = request.params as { id: string };
      
      // Attach the pickupDate to the request
      (request as any).body = { id, pickupDate };
      
      return shipmentController.schedulePickup(request as any, reply);
    }
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler },
    (request, reply) => {
      return shipmentController.cancelShipment(request as any, reply);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id/tracking-events',
    { preHandler },
    shipmentController.getTrackingEvents.bind(shipmentController)
  );

  // Bulk operations
  fastify.post(
    '/bulk/create',
    { preHandler },
    shipmentController.createShipmentBulk.bind(shipmentController)
  );

  fastify.post(
    '/bulk/schedule-pickup',
    { preHandler },
    shipmentController.schedulePickupBulk.bind(shipmentController)
  );

  fastify.post(
    '/bulk/cancel',
    { preHandler },
    shipmentController.cancelShipmentBulk.bind(shipmentController)
  );

  fastify.get<{ Params: { id: string } }>(
    '/bulk-operations/:id',
    { preHandler },
    shipmentController.getBulkOperationStatus.bind(shipmentController)
  );

  // Add a new route to get all bulk operations
  fastify.get(
    '/bulk-operations',
    { preHandler },
    async (request, reply) => {
      try {
        const { page = 1, pageSize = 10, type, status } = request.query as {
          page?: number;
          pageSize?: number;
          type?: string;
          status?: string;
        };

        const userId = request.userPayload!.id;
        
        // Build the where clause
        const where: any = { user_id: userId };
        
        if (type) {
          where.type = type;
        }
        
        if (status) {
          where.status = status;
        }
        
        // Get total count for pagination
        const total = await fastify.prisma.bulkOperation.count({ where });
        
        // Get paginated results
        const operations = await fastify.prisma.bulkOperation.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: parseInt(pageSize.toString(), 10),
        });

        // Calculate page count
        const pageCount = Math.ceil(total / pageSize);
        
        return reply.send({
          data: operations,
          meta: {
            total,
            page,
            pageSize,
            pageCount,
          }
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    }
  );

  // Shipment statistics
  fastify.get(
    '/stats',
    { preHandler },
    shipmentController.getShipmentStats.bind(shipmentController)
  );
} 