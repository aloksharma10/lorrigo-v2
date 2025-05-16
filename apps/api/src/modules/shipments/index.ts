import { FastifyInstance } from 'fastify';
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
          dimensions: {
            type: 'object',
            properties: {
              length: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
            },
          },
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
    handler: (request, reply) => shipmentController.getShipmentById(request, reply),
  });

  // Update a shipment
  fastify.patch('/:id', {
    schema: {
      tags: ['Shipments'],
      summary: 'Update a shipment',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          status: { 
            type: 'string',
            enum: [
              'CREATED',
              'PICKUP_SCHEDULED',
              'PICKED_UP',
              'IN_TRANSIT',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
              'UNDELIVERED',
              'RETURNED',
              'EXCEPTION'
            ],
          },
          trackingUrl: { type: 'string', format: 'uri' },
        },
      },
    },
    handler: (request, reply) => shipmentController.updateShipment(request, reply),
  });

  // Add a tracking event to a shipment
  fastify.post('/:id/tracking', {
    schema: {
      tags: ['Shipments'],
      summary: 'Add a tracking event',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['location', 'description', 'status'],
        properties: {
          location: { type: 'string' },
          description: { type: 'string' },
          status: { 
            type: 'string',
            enum: [
              'CREATED',
              'PICKUP_SCHEDULED',
              'PICKED_UP',
              'IN_TRANSIT',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
              'UNDELIVERED',
              'RETURNED',
              'EXCEPTION'
            ],
          },
        },
      },
    },
    handler: (request, reply) => shipmentController.addTrackingEvent(request, reply),
  });

  // Get tracking events for a shipment
  fastify.get('/:id/tracking', {
    schema: {
      tags: ['Shipments'],
      summary: 'Get tracking events for a shipment',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: (request, reply) => shipmentController.getTrackingEvents(request, reply),
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
    handler: (request, reply) => shipmentController.cancelShipment(request, reply),
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