import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { NDRService } from '../services/ndr.service';

// Request schemas for validation
const GetNDROrdersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.string().optional(),
  awb: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  actionTaken: z.coerce.boolean().optional(),
  actionType: z.enum(['reattempt', 'return', 'cancel', 'fake-attempt']).optional(),
});

const TakeNDRActionSchema = z.object({
  ndrId: z.string().min(1, 'NDR ID is required'),
  actionType: z.enum(['reattempt', 'return', 'cancel', 'fake-attempt'], {
    required_error: 'Action type is required',
  }),
  comment: z.string().min(1, 'Comment is required'),
  nextAttemptDate: z.string().optional(),
});

const BulkNDRActionSchema = z.object({
  ndrIds: z.array(z.string()).min(1, 'At least one NDR ID is required'),
  actionType: z.enum(['reattempt', 'return', 'cancel', 'fake-attempt'], {
    required_error: 'Action type is required',
  }),
  comment: z.string().min(1, 'Comment is required'),
  nextAttemptDate: z.string().optional(),
});

const CreateNDRRecordSchema = z.object({
  shipmentId: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
  courierId: z.string().optional(),
  awb: z.string().min(1, 'AWB is required'),
  cancellationReason: z.string().optional(),
  ndrRaisedAt: z.string().transform((str) => new Date(str)).optional(),
});

/**
 * NDR Controller
 * Handles NDR (Non-Delivery Report) operations including listing, actions, and bulk operations
 */
export class NDRController {
  private ndrService: NDRService;

  constructor(private fastify: FastifyInstance) {
    this.ndrService = new NDRService(fastify);
  }

  /**
   * Get NDR orders with filtering and pagination
   * GET /ndr/orders
   */
  async getNDROrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Validate query parameters
      const validatedQuery = GetNDROrdersSchema.parse(request.query);

      const result = await this.ndrService.getNDROrders(
        userId,
        {
          status: validatedQuery.status,
          awb: validatedQuery.awb,
          startDate: validatedQuery.startDate,
          endDate: validatedQuery.endDate,
          actionTaken: validatedQuery.actionTaken,
          actionType: validatedQuery.actionType,
        },
        validatedQuery.page,
        validatedQuery.limit
      );

      return reply.send({
        success: result.success,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      this.fastify.log.error('Error getting NDR orders:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Take NDR action for a single shipment
   * POST /ndr/action
   */
  async takeNDRAction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Validate request body
      const validatedBody = TakeNDRActionSchema.parse(request.body);

      const result = await this.ndrService.takeNDRAction(
        validatedBody.ndrId,
        validatedBody.actionType,
        validatedBody.comment,
        userId,
        validatedBody.nextAttemptDate
      );

      const statusCode = result.success ? 200 : 400;
      return reply.status(statusCode).send(result);
    } catch (error) {
      this.fastify.log.error('Error taking NDR action:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Process NDR actions in bulk
   * POST /ndr/bulk-action
   */
  async bulkNDRAction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Validate request body
      const validatedBody = BulkNDRActionSchema.parse(request.body);

      // Transform to the format expected by NDRService
      const ndrActions = validatedBody.ndrIds.map((ndrId) => ({
        ndrId,
        actionType: validatedBody.actionType,
        comment: validatedBody.comment,
        nextAttemptDate: validatedBody.nextAttemptDate,
      }));

      const result = await this.ndrService.processNDRActionsBatch(ndrActions, userId);

      const statusCode = result.success ? 202 : 400; // 202 Accepted for async processing
      return reply.status(statusCode).send(result);
    } catch (error) {
      this.fastify.log.error('Error processing bulk NDR actions:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get bulk operation status
   * GET /ndr/bulk-status/:operationId
   */
  async getBulkOperationStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const { operationId } = request.params as { operationId: string };

      if (!operationId) {
        return reply.status(400).send({
          success: false,
          message: 'Operation ID is required',
        });
      }

      const result = await this.ndrService.getBulkOperationStatus(operationId, userId);

      const statusCode = result.success ? 200 : 404;
      return reply.status(statusCode).send(result);
    } catch (error) {
      this.fastify.log.error('Error getting bulk operation status:', error);

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Create NDR record
   * POST /ndr/create
   */
  async createNDRRecord(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Validate request body
      const validatedBody = CreateNDRRecordSchema.parse(request.body);

      const result = await this.ndrService.createNDRRecord(validatedBody, userId);

      const statusCode = result.success ? 201 : 400;
      return reply.status(statusCode).send(result);
    } catch (error) {
      this.fastify.log.error('Error creating NDR record:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get NDR statistics
   * GET /ndr/stats
   */
  async getNDRStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Get NDR statistics from the database
      const stats = await this.fastify.prisma.nDROrder.groupBy({
        by: ['action_taken', 'action_type'],
        where: {
          OR: [
            {
              order: {
                user_id: userId,
              },
            },
            {
              shipment: {
                order: {
                  user_id: userId,
                },
              },
            },
          ],
        },
        _count: {
          id: true,
        },
      });

      // Process statistics
      let totalNDRs = 0;
      let pendingActions = 0;
      let completedActions = 0;
      const actionBreakdown: Record<string, number> = {};

      for (const stat of stats) {
        const count = stat._count.id;
        totalNDRs += count;

        if (stat.action_taken) {
          completedActions += count;
          if (stat.action_type) {
            actionBreakdown[stat.action_type] = (actionBreakdown[stat.action_type] || 0) + count;
          }
        } else {
          pendingActions += count;
        }
      }

      return reply.send({
        success: true,
        data: {
          total: totalNDRs,
          pending: pendingActions,
          completed: completedActions,
          actionBreakdown,
        },
      });
    } catch (error) {
      this.fastify.log.error('Error getting NDR statistics:', error);

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 