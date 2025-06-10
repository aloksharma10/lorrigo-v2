import { FastifyInstance, FastifyRequest } from 'fastify';
import { ShipmentController } from './controllers/shipmentsController';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { ShipmentService } from './services/shipmentService';
import { OrderService } from '../orders/services/order-service';

/**
 * Shipments module routes
 */
export default async function shipmentRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);
  const shipmentService = new ShipmentService(fastify, new OrderService(fastify));
  const shipmentController = new ShipmentController(shipmentService);

    // Get rates for an order
    fastify.get('/:id/rates', {
      schema: {
        tags: ['Orders'],
        summary: 'Get rates for an order',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
      handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) =>
        shipmentController.getRates(request, reply),
    });

  // Create a new shipment
  fastify.post('/', {
    schema: {
      tags: ['Shipments'],
      summary: 'Create a new shipment',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['order_id', 'courier_id'],
        properties: {
          order_id: { type: 'string' },
          courier_id: { type: 'string' },
        },
      },
    },
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: (request, reply) => shipmentController.createShipment(request, reply),
  });

  // Get all shipments
  fastify.get('/', {
    schema: {
      tags: ['Shipments'],
      summary: 'Get all shipments',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => shipmentController.getAllShipments(request, reply),
  });

  // Get a specific shipment by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Shipments'],
      summary: 'Get a shipment by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply) =>
      shipmentController.getShipmentById(request, reply),
  });
  // Cancel a shipment
  fastify.post('/:id/cancel', {
    schema: {
      tags: ['Shipments'],
      summary: 'Cancel a shipment',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) =>
      shipmentController.cancelShipment(request, reply),
  });

  // Get shipment statistics
  fastify.get('/stats/summary', {
    schema: {
      tags: ['Shipments'],
      summary: 'Get shipment statistics',
      security: [{ bearerAuth: [] }],
    },
    handler: (request, reply) => shipmentController.getShipmentStats(request, reply),
  });
}
