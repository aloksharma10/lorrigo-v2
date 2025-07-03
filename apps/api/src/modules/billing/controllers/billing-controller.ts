import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { BillingService } from '../services/billing-service';

const GetBillingByMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const ManualBillingSchema = z.object({
  awbs: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }).optional()
});

export class BillingController {
  constructor(private billingService: BillingService) {}

  /**
   * Upload billing CSV file (Admin only)
   */
  async uploadBillingCSV(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get file from multipart form data
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate file type
      if (!data.mimetype.includes('csv') && !data.filename?.endsWith('.csv')) {
        return reply.code(400).send({
          success: false,
          message: 'File must be a CSV'
        });
      }

      // Get file buffer
      const buffer = await data.toBuffer();
      
      if (buffer.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'File is empty'
        });
      }

      const userId = request.userPayload!.id;
      const filename = data.filename || 'billing.csv';

      const result = await this.billingService.uploadBillingCSV(
        buffer,
        userId,
        filename
      );

      return reply.code(200).send({
        success: true,
        data: result
      });

    } catch (error: any) {
      request.log.error(`Error uploading billing CSV: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to upload billing CSV',
        error: error.message
      });
    }
  }

  /**
   * Process manual billing for specific orders or date range (Admin only)
   */
  async processManualBilling(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };
      const body = request.body as any;
      const adminUserId = request.userPayload!.id;

      // Validate request body
      const validatedData = ManualBillingSchema.parse(body);

      if (!validatedData.awbs && !validatedData.dateRange) {
        return reply.code(400).send({
          success: false,
          message: 'Either AWBs or date range must be provided'
        });
      }

      const dateRange = validatedData.dateRange ? {
        from: new Date(validatedData.dateRange.from),
        to: new Date(validatedData.dateRange.to)
      } : undefined;

      const result = await this.billingService.processManualBilling(
        userId,
        validatedData.awbs,
        dateRange,
        adminUserId
      );

      return reply.code(200).send({
        success: true,
        data: result
      });

    } catch (error: any) {
      request.log.error(`Error processing manual billing: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to process manual billing',
        error: error.message
      });
    }
  }

  /**
   * Create automatic billing cycle for user (Admin only)
   */
  async createBillingCycle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };
      const { cycleDays = 30 } = request.body as { cycleDays?: number };

      const billingCycleId = await this.billingService.createAutomaticBillingCycle(
        userId,
        cycleDays
      );

      return reply.code(201).send({
        success: true,
        data: {
          billingCycleId,
          message: 'Billing cycle created successfully'
        }
      });

    } catch (error: any) {
      request.log.error(`Error creating billing cycle: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to create billing cycle',
        error: error.message
      });
    }
  }

  /**
   * Get billing summary by month (Admin)
   */
  async getBillingSummaryByMonth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { month } = request.params as { month: string };
      const query = request.query as any;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;

      // Validate month format
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return reply.code(400).send({
          success: false,
          message: 'Month must be provided in YYYY-MM format'
        });
      }

      const result = await this.billingService.getBillingSummaryByMonth(month, page, limit);

      return reply.code(200).send({
        success: true,
        data: result
      });

    } catch (error: any) {
      request.log.error(`Error getting billing summary: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get billing summary',
        error: error.message
      });
    }
  }

  /**
   * Get user billing details for a month
   */
  async getUserBillingByMonth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { month } = request.params as { month: string };
      const { userId } = request.params as { userId?: string };
      
      // For admin, use provided userId; for users, use their own ID
      const targetUserId = request.userPayload!.role === 'ADMIN' && userId ? userId : request.userPayload!.id;

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return reply.code(400).send({
          success: false,
          message: 'Month must be in YYYY-MM format'
        });
      }

      const result = await this.billingService.getUserBillingByMonth(targetUserId, month);

      return reply.code(200).send({
        success: true,
        data: result
      });

    } catch (error: any) {
      request.log.error(`Error getting user billing: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get user billing',
        error: error.message
      });
    }
  }

  /**
   * Get available billing months
   */
  async getAvailableBillingMonths(request: FastifyRequest, reply: FastifyReply) {
    try {
      const months = await this.billingService.getAvailableBillingMonths();

      return reply.code(200).send({
        success: true,
        data: months
      });

    } catch (error: any) {
      request.log.error(`Error getting billing months: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get billing months',
        error: error.message
      });
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { operationId } = request.params as { operationId: string };
      const userId = request.userPayload!.id;

      const result = await this.billingService.getBulkOperationStatus(operationId, userId);

      return reply.code(200).send({
        success: true,
        data: result
      });

    } catch (error: any) {
      request.log.error(`Error getting bulk operation status: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get bulk operation status',
        error: error.message
      });
    }
  }
}
