import { FastifyInstance, FastifyRequest } from 'fastify';
import { OrderController } from './controllers/ordersController';

/**
 * Orders module routes
 */
export default async function ordersRoutes(fastify: FastifyInstance) {
  const orderController = new OrderController();

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Get all orders
  fastify.get('/', {
    schema: {
      tags: ['Orders'],
      summary: 'Get all orders',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: { 
            type: 'string',
            enum: ['CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']
          },
          search: { type: 'string' },
          fromDate: { type: 'string', format: 'date-time' },
          toDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  orderNumber: { type: 'string' },
                  status: { type: 'string' },
                  totalAmount: { type: 'number' },
                  customerId: { type: 'string' },
                  customerName: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    handler: (request, reply) => orderController.getAllOrders(request, reply),
  });
  
  // Get a single order by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Orders'],
      summary: 'Get an order by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            totalAmount: { type: 'number' },
            notes: { type: 'string' },
            customer: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
              },
            },
            shippingAddress: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string' },
              },
            },
            shipments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  trackingNumber: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) => orderController.getOrderById(request, reply),
  });
  
  // Create a new order
  fastify.post('/', {
    schema: {
      tags: ['Orders'],
      summary: 'Create a new order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['customerId', 'shippingAddressId', 'totalAmount', 'items'],
        properties: {
          customerId: { type: 'string' },
          shippingAddressId: { type: 'string' },
          returnAddressId: { type: 'string' },
          totalAmount: { type: 'number' },
          notes: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'quantity', 'unitPrice'],
              properties: {
                description: { type: 'string' },
                quantity: { type: 'integer' },
                unitPrice: { type: 'number' },
              },
            },
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            customerId: { type: 'string' },
            totalAmount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request, reply) => orderController.createOrder(request, reply),
  });
  
  // Update an order status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Orders'],
      summary: 'Update order status',
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
        required: ['status'],
        properties: {
          status: { 
            type: 'string',
            enum: ['CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']
          },
          notes: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: { status: string; notes?: string };
    }>, reply) => orderController.updateOrderStatus(request, reply),
  });
  
  // Cancel an order
  fastify.post('/:id/cancel', {
    schema: {
      tags: ['Orders'],
      summary: 'Cancel an order',
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
          reason: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request: FastifyRequest<{
      Params: { id: string };
      Body: { reason?: string };
    }>, reply) => orderController.cancelOrder(request, reply),
  });
  
  // Get order statistics
  fastify.get('/stats', {
    schema: {
      tags: ['Orders'],
      summary: 'Get order statistics',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: { 
            type: 'string',
            enum: ['day', 'week', 'month', 'year'],
            default: 'month'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalOrders: { type: 'integer' },
            totalAmount: { type: 'number' },
            statusCounts: {
              type: 'object',
              properties: {
                CREATED: { type: 'integer' },
                CONFIRMED: { type: 'integer' },
                PROCESSING: { type: 'integer' },
                SHIPPED: { type: 'integer' },
                DELIVERED: { type: 'integer' },
                CANCELLED: { type: 'integer' },
                RETURNED: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => orderController.getOrderStats(request, reply),
  });
} 