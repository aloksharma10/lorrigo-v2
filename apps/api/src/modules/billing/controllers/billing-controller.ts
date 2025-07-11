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

  async actOnDispute(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { action, comment, finalWeight } = request.body as { 
        action: 'ACCEPT' | 'REJECT' | 'RAISE'; 
        comment?: string;
        finalWeight?: number;
      };
      const isAdmin = request.userPayload?.role === 'ADMIN';

      const dispute = await this.billingService['fastify'].prisma.weightDispute.findUnique({
        where: { id },
        include: { order: true }
      });

      if (!dispute) {
        return reply.code(404).send({ success: false, error: 'Dispute not found' });
      }

      // Check permissions
      if (!isAdmin && dispute.user_id !== request.userPayload?.id) {
        return reply.code(403).send({ success: false, error: 'Access denied' });
      }

      let updateData: any = {
        seller_action_taken: true,
        seller_response: comment || '',
        updated_at: new Date(),
      };

      if (isAdmin) {
        // Admin actions
        if (action === 'ACCEPT') {
          updateData.status = WeightDisputeStatus.RESOLVED;
          updateData.resolution = 'Accepted by admin';
          if (finalWeight) {
            updateData.final_weight = finalWeight;
          }
        } else if (action === 'REJECT') {
          updateData.status = WeightDisputeStatus.REJECTED;
          updateData.resolution = 'Rejected by admin';
        }
        updateData.resolved_by = request.userPayload?.id;
        updateData.resolution_date = new Date();
      } else {
        // Seller actions
        if (action === 'ACCEPT') {
          updateData.status = WeightDisputeStatus.RESOLVED;
          updateData.resolution = 'Accepted by seller';
        } else if (action === 'RAISE') {
          updateData.status = WeightDisputeStatus.RAISED_BY_SELLER;
        }
      }

      await this.billingService['fastify'].prisma.weightDispute.update({
        where: { id },
        data: updateData
      });

      return reply.send({ success: true });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update dispute' 
      });
    }
  }
}
