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

  fastify.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler },
    shipmentController.updateShipment.bind(shipmentController)
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
      const { reason } = request.body as { reason?: string };
      const { id } = request.params as { id: string };
      
      // Attach the reason to the request
      (request as any).body = { id, reason };
      
      return shipmentController.cancelShipment(request as any, reply);
    }
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/tracking-events',
    { preHandler },
    shipmentController.addTrackingEvent.bind(shipmentController)
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

  // Shipment statistics
  fastify.get(
    '/stats',
    { preHandler },
    shipmentController.getShipmentStats.bind(shipmentController)
  );
} 