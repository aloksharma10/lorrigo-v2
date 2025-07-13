import { FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from '../services/billing-service';
import { WeightDisputeStatus } from '@lorrigo/db';

export class BillingController {
  constructor(private billingService: BillingService) {}

  async manualBilling(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;

      // If awbs/date provided – manual mode
      if (body.awbs || (body.startDate && body.endDate)) {
        const { awbs, startDate, endDate, userId } = body;
        const result = await this.billingService.generateManualBilling({
          awbs,
          startDate,
          endDate,
          userId,
        });
        return reply.send({ success: true, mode: 'manual', result });
      }

      // Otherwise run standard billing (by cycle)
      const { userId } = body || {};
      if (!userId) {
        return reply.code(400).send({ success: false, error: 'User ID is required' });
      }
      
      const result = await this.billingService.runBilling(userId);
      return reply.send({ success: true, result });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Billing failed' 
      });
    }
  }

  async getBillingCycles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, userId } = request.query as any;
      const currentUserId = request.userPayload?.id;
      const isAdmin = request.userPayload?.role === 'ADMIN';

      const where: any = {};
      if (!isAdmin) {
        where.user_id = currentUserId;
      } else if (userId) {
        where.user_id = userId;
      }

      const skip = (page - 1) * limit;
      
      const [billingCycles, total] = await Promise.all([
        this.billingService['fastify'].prisma.userBilling.findMany({
          where,
          include: {
            user: { select: { name: true, email: true } },
            _count: { select: { billings: true } }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        this.billingService['fastify'].prisma.userBilling.count({ where })
      ]);

      return reply.send({
        success: true,
        data: billingCycles,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get billing cycles' 
      });
    }
  }

  async getBillingHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, billingCycleId } = request.query as any;
      const currentUserId = request.userPayload?.id;
      const isAdmin = request.userPayload?.role === 'ADMIN';

      const where: any = {};
      if (!isAdmin) {
        where.order = { user_id: currentUserId };
      }
      if (billingCycleId) {
        where.billing_cycle_id = billingCycleId;
      }

      const skip = (page - 1) * limit;
      
      const [billings, total] = await Promise.all([
        this.billingService['fastify'].prisma.billing.findMany({
          where,
          include: {
            order: {
              select: { 
                code: true, 
                user: { select: { name: true, email: true } },
                customer: { select: { name: true } }
              }
            }
          },
          orderBy: { billing_date: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        this.billingService['fastify'].prisma.billing.count({ where })
      ]);

      return reply.send({
        success: true,
        data: billings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get billing history' 
      });
    }
  }

  async getDisputes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, status } = request.query as any;
      const currentUserId = request.userPayload?.id;
      const isAdmin = request.userPayload?.role === 'ADMIN';

      const where: any = {};
      if (!isAdmin) {
        where.user_id = currentUserId;
      }
      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;
      
      const [disputes, total] = await Promise.all([
        this.billingService['fastify'].prisma.weightDispute.findMany({
          where,
          include: {
            order: {
              select: { 
                code: true,
                customer: { select: { name: true } }
              }
            },
            user: { select: { name: true, email: true } }
          },
          orderBy: { dispute_raised_at: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        this.billingService['fastify'].prisma.weightDispute.count({ where })
      ]);

      return reply.send({
        success: true,
        data: disputes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get disputes' 
      });
    }
  }

  /**
   * Handle dispute action (accept, reject, or raise)
   */
  async actOnDispute(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { action, comment, resolution, final_weight, revised_charges } = request.body as {
        action: 'ACCEPT' | 'REJECT' | 'RAISE';
        comment?: string;
        resolution?: string;
        final_weight?: number;
        revised_charges?: number;
      };

      // Validate required fields
      if (!action) {
        return reply.code(400).send({ error: 'Action is required' });
      }

      // Get the dispute
      const dispute = await request.server.prisma.weightDispute.findUnique({
        where: { id },
        include: {
          order: {
            select: {
              id: true,
              user_id: true,
            },
          },
        },
      });

      if (!dispute) {
        return reply.code(404).send({ error: 'Dispute not found' });
      }

      // Check user permissions
      const userId = request.userPayload?.id;
      const userRole = request.userPayload?.role;

      // Sellers can only act on their own disputes
      if (userRole === 'SELLER' && dispute.order?.user_id !== userId) {
        return reply.code(403).send({ error: 'You do not have permission to act on this dispute' });
      }

      let result;

      switch (action) {
        case 'ACCEPT':
          // Accept the dispute (admin or seller)
          result = await this.billingService.acceptDispute(id, {
            resolution: resolution || 'Accepted via API',
            final_weight,
            revised_charges,
            resolved_by: userId || '',
          });
          break;
        case 'REJECT':
          // Reject the dispute (admin only)
          if (userRole !== 'ADMIN') {
            return reply.code(403).send({ error: 'Only admins can reject disputes' });
          }
          result = await this.billingService.rejectDispute(id, {
            resolution: resolution || 'Rejected via API',
            resolved_by: userId || '',
          });
          break;
        case 'RAISE':
          // Raise the dispute (seller only)
          if (userRole !== 'SELLER' && userRole !== 'ADMIN') {
            return reply.code(403).send({ error: 'Only sellers can raise disputes' });
          }
          
          // Process images if they exist in the request
          const images: string[] = [];
          
          // Handle form data with images
          if (request.isMultipart()) {
            const parts = request.parts();
            
            for await (const part of parts) {
              if (part.type === 'file') {
                // Process and store the image
                const fileName = `${Date.now()}-${part.filename}`;
                const filePath = `/uploads/disputes/${fileName}`;
                
                // Save the file
                await this.billingService.saveDisputeImage(part.file, filePath);
                
                // Add the file URL to the images array
                images.push(filePath);
              }
            }
          }
          
          result = await this.billingService.raiseDispute(id, {
            comment: comment || '',
            evidence_urls: images,
            raised_by: userId || '',
          });
          break;
        default:
          return reply.code(400).send({ error: 'Invalid action' });
      }

      return reply.code(200).send({
        success: true,
        message: `Dispute ${action.toLowerCase()}ed successfully`,
        data: result,
      });
    } catch (error) {
      request.log.error(`Error in actOnDispute: ${error}`);
      return reply.code(500).send({
        error: 'Failed to process dispute action',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
