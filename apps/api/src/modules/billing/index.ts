import { FastifyInstance } from 'fastify';
import { BillingController } from './controllers/billing-controller';
import { BillingService } from './services/billing-service';
import { initBillingWorker } from './queues/billing-worker';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

/**
 * Billing module routes
 */
export default async function billingRoutes(fastify: FastifyInstance) {
  const billingService = new BillingService(fastify);
  const billingController = new BillingController(billingService);

  // Initialize billing worker
  const { billingWorker } = initBillingWorker(fastify);

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Upload billing CSV (Admin only)
  fastify.post('/upload-csv', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Upload billing CSV file',
      description: 'Upload CSV file with AWB and Weight columns for billing processing',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                totalRecords: { type: 'number' },
                processedCount: { type: 'number' },
                errorCount: { type: 'number' },
                bulkOperationId: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    handler: (request, reply) => billingController.uploadBillingCSV(request, reply),
  });

  // Get billing summary by month (Admin)
  fastify.get('/summary/:month', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Get billing summary by month',
      description: 'Get billing summary grouped by users for a specific month',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['month'],
        properties: {
          month: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in YYYY-MM format'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                month: { type: 'string' },
                total_orders: { type: 'number' },
                total_amount: { type: 'number' },
                pending_amount: { type: 'number' },
                paid_amount: { type: 'number' },
                disputed_amount: { type: 'number' },
                users: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      user_id: { type: 'string' },
                      user_name: { type: 'string' },
                      user_email: { type: 'string' },
                      total_orders: { type: 'number' },
                      total_amount: { type: 'number' },
                      pending_amount: { type: 'number' },
                      paid_amount: { type: 'number' },
                      disputed_amount: { type: 'number' }
                    }
                  }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: (request, reply) => billingController.getBillingSummaryByMonth(request, reply),
  });

  // Get user billing details for a month
  fastify.get('/user/:userId/:month', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Get user billing details for a month (Admin)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId', 'month'],
        properties: {
          userId: { type: 'string' },
          month: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in YYYY-MM format'
          }
        }
      }
    },
    handler: (request, reply) => billingController.getUserBillingByMonth(request, reply),
  });

  // Get current user's billing details for a month
  fastify.get('/my-billing/:month', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Get current user billing details for a month',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['month'],
        properties: {
          month: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',          // YYYY‑MM
            description: 'Month in YYYY-MM format'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          required: ['billing_month', 'user_id', 'records', 'summary', 'pagination'],
          properties: {
            billing_month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            user_id: { type: 'string' },
            records: {
              type: 'array',
              items: {
                type: 'object',
                required: [
                  'id', 'code', 'order_id', 'billing_date', 'billing_month',
                  'billing_amount', 'charged_weight', 'fw_excess_charge',
                  'rto_excess_charge', 'zone_change_charge', 'cod_charge',
                  'is_forward_applicable', 'is_rto_applicable',
                  'base_price', 'base_weight', 'increment_price',
                  'order_weight', 'order_zone', 'charged_zone',
                  'courier_name', 'is_processed', 'payment_status',
                  'created_at', 'updated_at'
                ],
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  order_id: { type: 'string' },
                  billing_date: { type: 'string', format: 'date-time' },
                  billing_month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
                  billing_amount: { type: 'number' },
                  charged_weight: { type: 'number' },
                  fw_excess_charge: { type: 'number' },
                  rto_excess_charge: { type: 'number' },
                  zone_change_charge: { type: 'number' },
                  cod_charge: { type: 'number' },
                  is_forward_applicable: { type: 'boolean' },
                  is_rto_applicable: { type: 'boolean' },
                  base_price: { type: 'number' },
                  base_weight: { type: 'number' },
                  increment_price: { type: 'number' },
                  order_weight: { type: 'number' },
                  order_zone: { type: 'string', maxLength: 1 },
                  charged_zone: { type: 'string', maxLength: 1 },
                  courier_name: { type: 'string' },
                  is_processed: { type: 'boolean' },
                  payment_status: { type: 'string', enum: ['PAID', 'NOT_PAID', 'DISPUTED'] },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  order: { type: 'object', additionalProperties: true } // expandable
                }
              }
            },
            summary: {
              type: 'object',
              required: [
                'total_orders',
                'total_billing_amount',
                'pending_amount',
                'paid_amount',
                'disputed_amount'
              ],
              properties: {
                total_orders: { type: 'integer', minimum: 0 },
                total_billing_amount: { type: 'number', minimum: 0 },
                pending_amount: { type: 'number', minimum: 0 },
                paid_amount: { type: 'number', minimum: 0 },
                disputed_amount: { type: 'number', minimum: 0 }
              }
            },
            pagination: {
              type: 'object',
              required: ['page', 'pageSize', 'total', 'pageCount'],
              properties: {
                page: { type: 'integer', minimum: 1 },
                pageSize: { type: 'integer', minimum: 1 },
                total: { type: 'integer', minimum: 0 },
                pageCount: { type: 'integer', minimum: 1 }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { month } = request.params as { month: string };
      const userId = request.userPayload!.id;
      const result = await billingService.getUserBillingByMonth(userId, month);
      return reply.code(200).send(result);
    }
  });

  // Get available billing months
  fastify.get('/months', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SELLER])],
    schema: {
      tags: ['Billing'],
      summary: 'Get available billing months',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    handler: (request, reply) => billingController.getAvailableBillingMonths(request, reply),
  });

  // Get bulk operation status
  fastify.get('/status/:operationId', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Get bulk operation status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['operationId'],
        properties: {
          operationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                status: { type: 'string' },
                total_count: { type: 'number' },
                processed_count: { type: 'number' },
                success_count: { type: 'number' },
                failed_count: { type: 'number' },
                progress: { type: 'number' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            }
          }
        }
      }
    },
    handler: (request, reply) => billingController.getBulkOperationStatus(request, reply),
  });

  // Health check for billing worker
  fastify.get('/worker/health', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Billing'],
      summary: 'Check billing worker health',
      security: [{ bearerAuth: [] }]
    },
    handler: async (request, reply) => {
      try {
        const queueHealth = await billingWorker.isRunning();
        return reply.code(200).send({
          success: true,
          data: {
            workerRunning: queueHealth,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Failed to check worker health',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },
  });
} 