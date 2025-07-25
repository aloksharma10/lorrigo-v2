import { FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from '../services/billing-service';
import { WeightDisputeStatus } from '@lorrigo/db';
import { exportData } from '@/utils/exportData';

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
                customer: { select: { name: true } },
                hub: { select: { name: true, address: { select: { pincode: true } } } }
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
                customer: { select: { name: true } },
                shipment: { select: { awb: true, courier: { select: { name: true, channel_config: { select: { nickname: true } } } } } }
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

  /**
   * Export disputes as CSV or XLSX
   */
  async exportDisputes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { status, userId, format = 'csv' } = request.query as any;
      const currentUserId = request.userPayload?.id;
      const isAdmin = request.userPayload?.role === 'ADMIN';
      const where: any = {};
      if (!isAdmin) {
        where.user_id = currentUserId;
      } else if (userId) {
        where.user_id = userId;
      }
      if (status) {
        where.status = status;
      }
      // Fetch all disputes (limit to 10k for safety)
      const disputes = await this.billingService['fastify'].prisma.weightDispute.findMany({
        where,
        include: {
          order: {
            select: {
              code: true,
              customer: { select: { name: true } },
              shipment: { select: { awb: true } },
              // product: { select: { name: true, sku: true, id: true } }, // Removed, not a valid field
              // dimensions: true, // Removed, not a valid field
              // volumetric_weight: true, // Removed, not a valid field
            },
          },
          user: { select: { name: true, email: true } },
        },
        orderBy: { dispute_raised_at: 'desc' },
        take: 10000,
      });
      // Map disputes to flat objects for CSV
      const mapped = disputes.map((d: any) => ({
        dispute_id: d.dispute_id,
        awb: d.order?.shipment?.awb,
        customer: d.order?.customer?.name,
        // product_name: d.order?.product?.name, // Removed
        // product_sku: d.order?.product?.sku,   // Removed
        // product_id: d.order?.product?.id,     // Removed
        original_weight: d.original_weight,
        disputed_weight: d.disputed_weight,
        forward_excess_amount: d.forward_excess_amount,
        rto_excess_amount: d.rto_excess_amount,
        total_disputed_amount: d.total_disputed_amount,
        status: d.status,
        deadline_date: d.deadline_date,
        created_at: d.created_at,
        user_name: d.user?.name,
        user_email: d.user?.email,
        evidence_urls: (d.evidence_urls || []).join(';'),
        seller_evidence_urls: (d.seller_evidence_urls || []).join(';'),
        resolution: d.resolution,
        resolution_date: d.resolution_date,
      }));
      const fields = [
        'dispute_id','awb','customer','original_weight','disputed_weight','forward_excess_amount','rto_excess_amount','total_disputed_amount','status','deadline_date','created_at','user_name','user_email','evidence_urls','seller_evidence_urls','resolution','resolution_date'
      ];
      const fileName = `weight-disputes-${status || 'all'}-${new Date().toISOString().split('T')[0]}.${format}`;
      const { csvBuffer, filename } = exportData(fields, mapped, format, fileName);
      if (format === 'xlsx') {
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        reply.header('Content-Type', 'text/csv');
      }
      reply.header('Content-Disposition', `attachment; filename=${fileName}`);
      return reply.send(csvBuffer);
    } catch (error) {
      request.log.error(`Error exporting disputes: ${error}`);
      return reply.code(500).send({ error: 'Failed to export disputes', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Get billing summary by month
   */
  async getBillingSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { month } = request.params as { month: string };
      const { page = 1, limit = 10 } = request.query as any;
      const currentUserId = request.userPayload?.id;
      const isAdmin = request.userPayload?.role === 'ADMIN';
  
      if (!month) {
        return reply.code(400).send({
          success: false,
          error: 'Month parameter is required (format: YYYY-MM)',
        });
      }
  
      // Validate month format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid month format. Use YYYY-MM (e.g., 2023-05)',
        });
      }
  
      const skip = (page - 1) * limit;
  
      // Get all billings for the month
      const billingWhere: any = {
        billing_month: month,
      };
  
      if (!isAdmin) {
        billingWhere.order = { user_id: currentUserId };
      }
  
      // Get billing data with pagination directly in the Prisma query
      const [billings, totalBillings] = await Promise.all([
        this.billingService['fastify'].prisma.billing.findMany({
          where: billingWhere,
          select: {
            id: true,
            billing_amount: true,
            paid_amount: true,
            pending_amount: true,
            disputed_amount: true,
            payment_status: true,
            has_weight_dispute: true,
            order: {
              select: {
                user_id: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
          skip: skip,
          take: parseInt(limit),
        }),
        this.billingService['fastify'].prisma.billing.count({ where: billingWhere }),
      ]);

      console.log(billings);
  
      // Group billings by user
      const userBillings = new Map();
      let totalAmount = 0;
      let totalOrders = billings.length;
  
      for (const billing of billings) {
        const userId = billing.order?.user_id || '';
        const userName = billing.order?.user?.name || 'Unknown';
        const userEmail = billing.order?.user?.email || '';
  
        if (!userBillings.has(userId)) {
          userBillings.set(userId, {
            user_id: userId,
            user_name: userName,
            user_email: userEmail,
            total_orders: 0,
            total_billing_amount: 0,
            paid_amount: 0,
            pending_amount: 0,
            disputed_amount: 0,
          });
        }
  
        const userSummary = userBillings.get(userId);
        userSummary.total_orders += 1;
        userSummary.total_billing_amount += billing.billing_amount;
        userSummary.paid_amount += billing.paid_amount || 0;
        userSummary.pending_amount += billing.pending_amount || 0;
        if (billing.has_weight_dispute) {
          userSummary.disputed_amount += billing.disputed_amount || 0;
        }
        totalAmount += billing.billing_amount;
      }
  
      // Convert to array
      const userSummaries = Array.from(userBillings.values());
  
      return reply.send({
        success: true,
        total_amount: totalAmount,
        total_orders: totalOrders,
        users: userSummaries,
        pagination: {
          total: totalBillings,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalBillings / limit),
        },
      });
    } catch (error) {
      request.log.error(`Error in getBillingSummary: ${error}`);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get billing summary',
      });
    }
  }
}