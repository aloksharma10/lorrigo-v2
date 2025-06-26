import { FastifyInstance } from 'fastify';
import { NDRController } from '../controllers/ndr.controller';
import { authenticateUser } from '@/middleware/auth';

/**
 * NDR Routes
 * Handles all NDR-related API endpoints with proper authentication and rate limiting
 */
export default async function ndrRoutes(fastify: FastifyInstance) {
  const ndrController = new NDRController(fastify);

  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', fastify.authenticate);


  // Rate limiting for NDR routes
  // await fastify.register(import('@fastify/rate-limit'), {
  //   max: 100, // Maximum 100 requests
  //   timeWindow: '1 minute', // Per minute
  //   keyGenerator: (request) => {
  //     return `ndr:${request.userPayload?.id || request.ip}`;
  //   },
  // });

  /**
   * GET /ndr/orders
   * Get NDR orders with filtering and pagination
   * 
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   * - status: string (optional)
   * - awb: string (optional)
   * - startDate: string (ISO date, optional)
   * - endDate: string (ISO date, optional)
   * - actionTaken: boolean (optional)
   * - actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt' (optional)
   */
  fastify.get('/orders', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
          status: { type: 'string' },
          awb: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          actionTaken: { type: 'boolean' },
          actionType: { 
            type: 'string', 
            enum: ['reattempt', 'return', 'cancel', 'fake-attempt'] 
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
    preHandler: [
      // Additional rate limiting for GET requests
      fastify.rateLimit({
        max: 60,
        timeWindow: '1 minute',
      }),
    ],
  }, ndrController.getNDROrders.bind(ndrController));

  /**
   * POST /ndr/action
   * Take NDR action for a single shipment
   * 
   * Body:
   * - ndrId: string (required)
   * - actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt' (required)
   * - comment: string (required)
   * - nextAttemptDate: string (optional, ISO date)
   */
  fastify.post('/action', {
    schema: {
      body: {
        type: 'object',
        required: ['ndrId', 'actionType', 'comment'],
        properties: {
          ndrId: { type: 'string', minLength: 1 },
          actionType: { 
            type: 'string', 
            enum: ['reattempt', 'return', 'cancel', 'fake-attempt'] 
          },
          comment: { type: 'string', minLength: 1 },
          nextAttemptDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    preHandler: [
      // Stricter rate limiting for action endpoints
      fastify.rateLimit({
        max: 30,
        timeWindow: '1 minute',
      }),
    ],
  }, ndrController.takeNDRAction.bind(ndrController));

  /**
   * POST /ndr/bulk-action
   * Process NDR actions in bulk (async processing via queue)
   * 
   * Body:
   * - ndrIds: string[] (required, min 1 item)
   * - actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt' (required)
   * - comment: string (required)
   * - nextAttemptDate: string (optional, ISO date)
   */
  fastify.post('/bulk-action', {
    schema: {
      body: {
        type: 'object',
        required: ['ndrIds', 'actionType', 'comment'],
        properties: {
          ndrIds: { 
            type: 'array', 
            items: { type: 'string' },
            minItems: 1,
            maxItems: 100, // Limit bulk operations
          },
          actionType: { 
            type: 'string', 
            enum: ['reattempt', 'return', 'cancel', 'fake-attempt'] 
          },
          comment: { type: 'string', minLength: 1 },
          nextAttemptDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        202: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            operationId: { type: 'string' },
          },
        },
      },
    },
    preHandler: [
      // Very strict rate limiting for bulk operations
      fastify.rateLimit({
        max: 10,
        timeWindow: '1 minute',
      }),
    ],
  }, ndrController.bulkNDRAction.bind(ndrController));

  /**
   * GET /ndr/bulk-status/:operationId
   * Get bulk operation status
   * 
   * Params:
   * - operationId: string (required)
   */
  fastify.get('/bulk-status/:operationId', {
    schema: {
      params: {
        type: 'object',
        required: ['operationId'],
        properties: {
          operationId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, ndrController.getBulkOperationStatus.bind(ndrController));

  /**
   * POST /ndr/create
   * Create NDR record
   * 
   * Body:
   * - awb: string (required)
   * - customerId: string (required)
   * - shipmentId: string (optional)
   * - orderId: string (optional)
   * - courierId: string (optional)
   * - cancellationReason: string (optional)
   * - ndrRaisedAt: string (optional, ISO date)
   */
  fastify.post('/create', {
    schema: {
      body: {
        type: 'object',
        required: ['awb', 'customerId'],
        properties: {
          awb: { type: 'string', minLength: 1 },
          customerId: { type: 'string', minLength: 1 },
          shipmentId: { type: 'string' },
          orderId: { type: 'string' },
          courierId: { type: 'string' },
          cancellationReason: { type: 'string' },
          ndrRaisedAt: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            ndr: { type: 'object' },
          },
        },
      },
    },
    preHandler: [
      // Moderate rate limiting for create operations
      fastify.rateLimit({
        max: 20,
        timeWindow: '1 minute',
      }),
    ],
  }, ndrController.createNDRRecord.bind(ndrController));

  /**
   * GET /ndr/stats
   * Get NDR statistics for the authenticated user
   */
  fastify.get('/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                pending: { type: 'number' },
                completed: { type: 'number' },
                actionBreakdown: { type: 'object' },
              },
            },
          },
        },
      },
    },
    preHandler: [
      // Cache stats for 5 minutes to improve performance
      async (request, reply) => {
        const cacheKey = `ndr:stats:${request.userPayload!.id}`;
        const cached = await fastify.redis.get(cacheKey);
        
        if (cached) {
          return reply.send(JSON.parse(cached));
        }
        
        // Continue to controller if not cached
      },
    ],
  }, ndrController.getNDRStats.bind(ndrController));
} 