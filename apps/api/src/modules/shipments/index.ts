import { FastifyInstance } from 'fastify';
import { authorizeRoles, checkAuth } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

import { ShipmentController } from './controllers/shipmentsController';
import { OrderService } from '../orders/services/order-service';
import { ShipmentService } from './services/shipmentService';
import { initShipmentQueue } from './queues/shipmentQueue';

export async function shipmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // Initialize services
  const orderService = new OrderService(fastify);
  const shipmentService = new ShipmentService(fastify, orderService);

  // Initialize the shipment queue
  initShipmentQueue(fastify, shipmentService);

  // Create controller instance
  const shipmentController = new ShipmentController(shipmentService);

  // Add auth preHandler to all routes
  const preHandler = [checkAuth, authorizeRoles([Role.ADMIN, Role.SELLER])];

  // Shipment rates
  fastify.get<{ Params: { id: string } }>(
    '/:id/rates',
    { preHandler },
    shipmentController.getRates.bind(shipmentController)
  );

  // Single shipment operations
  fastify.post('', { preHandler }, shipmentController.createShipment.bind(shipmentController));

  fastify.get('', { preHandler }, shipmentController.getAllShipments.bind(shipmentController));

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

  fastify.post<{ Params: { id: string } }>('/:id/cancel', { preHandler }, (request, reply) => {
    return shipmentController.cancelShipment(request as any, reply);
  });

  fastify.get<{ Params: { id: string } }>(
    '/:id/tracking-events',
    { preHandler },
    shipmentController.getTrackingEvents.bind(shipmentController)
  );
  // Shipment statistics
  fastify.get(
    '/stats',
    { preHandler },
    shipmentController.getShipmentStats.bind(shipmentController)
  );
}
