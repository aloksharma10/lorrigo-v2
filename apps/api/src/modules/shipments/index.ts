import { FastifyInstance, FastifyRequest } from 'fastify';
import { ShipmentController } from './controllers/shipmentsController';

/**
 * Shipments module routes
 */
export default async function shipmentRoutes(fastify: FastifyInstance) {
  const shipmentController = new ShipmentController();

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Create a new shipment
  fastify.post('/', {
    schema: {
      tags: ['Shipments'],
      summary: 'Create a new shipment',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orderId', 'weight', 'hubId', 'courierId'],
        properties: {
          orderId: { type: 'string' },
          weight: { type: 'number' },
          hubId: { type: 'string' },
          courierId: { type: 'string' },
        },
      },
    },
    handler: (request, reply) => shipmentController.createShipment(request, reply),
  });

  // Get all shipments
  fastify.get('/', {
    schema: {
      tags: ['Shipments'],
      summary: 'Get all shipments',
      security: [{ bearerAuth: [] }],
    },
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
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply) => shipmentController.getShipmentById(request, reply),
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
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) => shipmentController.cancelShipment(request, reply),
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