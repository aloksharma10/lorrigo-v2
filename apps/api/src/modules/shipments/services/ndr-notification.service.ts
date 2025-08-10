import { FastifyInstance } from 'fastify';
import { TrackingNotificationService } from '@/lib/tracking-notifications';
import { WhatsAppQueueService } from '@/lib/whatsapp-queue.service';
import { captureException } from '@/lib/sentry';

export class NDRNotificationService {
  private fastify: FastifyInstance;
  private trackingNotificationService: TrackingNotificationService;
  private whatsappQueueService: WhatsAppQueueService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.trackingNotificationService = new TrackingNotificationService(fastify);
    this.whatsappQueueService = new WhatsAppQueueService(fastify);
  }

  /**
   * Handle NDR notification when a shipment moves to NDR status
   */
  async handleNDRCreated(
    ndrOrderId: string,
    orderId?: string,
    shipmentId?: string,
    awb?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get NDR order details with related shipment and order data
      const ndrOrder = await this.fastify.prisma.nDROrder.findUnique({
        where: { id: ndrOrderId },
        include: {
          order: {
            include: {
              user: {
                select: { id: true, phone: true }
              },
              customer: {
                select: { id: true, phone: true }
              }
            }
          },
          shipment: {
            include: {
              courier: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!ndrOrder) {
        return {
          success: false,
          message: 'NDR order not found'
        };
      }

      // Use order from NDR if available, otherwise fetch separately
      let order = ndrOrder.order;
      if (!order && orderId) {
        order = await this.fastify.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            user: {
              select: { id: true, phone: true }
            },
            customer: {
              select: { id: true, phone: true }
            }
          }
        });
      }

      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      // Send NDR notification to seller
      const result = await this.trackingNotificationService.sendSellerNDRNotification({
        orderId: order.id,
        orderNumber: order.code,
        customerPhone: order.customer.phone,
        sellerPhone: order.user.phone,
        awb: ndrOrder.awb || awb || '',
        courierName: ndrOrder.shipment?.courier?.name,
        ndrReason: ndrOrder.cancellation_reason || 'Delivery attempt failed',
        userId: order.user_id,
        customerId: order.customer_id,
      });

      return result;
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: `Failed to handle NDR notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Queue NDR notification directly (optimized for immediate queue)
   */
  async queueNDRNotification(
    ndrOrderId: string,
    options?: {
      orderId?: string;
      shipmentId?: string;
      awb?: string;
      userId?: string;
      priority?: number;
    }
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      return await this.whatsappQueueService.queueNDRNotification(ndrOrderId, {
        orderId: options?.orderId,
        shipmentId: options?.shipmentId,
        awb: options?.awb,
        userId: options?.userId,
        priority: options?.priority || 2, // High priority for NDR
      });
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: `Failed to queue NDR notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Batch process NDR notifications for multiple NDR orders
   */
  async batchProcessNDRNotifications(
    ndrOrderIds: string[]
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const ndrOrderId of ndrOrderIds) {
      try {
        results.processed++;
        const result = await this.handleNDRCreated(ndrOrderId);
        
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`NDR ${ndrOrderId}: ${result.message}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`NDR ${ndrOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Handle NDR action taken by seller - send confirmation notification
   */
  async handleNDRActionTaken(
    ndrOrderId: string,
    actionType: 'reattempt' | 'return' | 'cancel',
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get NDR order details
      const ndrOrder = await this.fastify.prisma.nDROrder.findUnique({
        where: { id: ndrOrderId },
        include: {
          order: {
            include: {
              customer: {
                select: { id: true, phone: true }
              }
            }
          }
        }
      });

      if (!ndrOrder?.order) {
        return {
          success: false,
          message: 'NDR order or related order not found'
        };
      }

      // Create a notification to customer about the action taken
      let message = '';
      switch (actionType) {
        case 'reattempt':
          message = `Your order ${ndrOrder.order.code} will be reattempted for delivery. Our delivery partner will contact you soon.`;
          break;
        case 'return':
          message = `Your order ${ndrOrder.order.code} is being returned as per your request. Refund will be processed accordingly.`;
          break;
        case 'cancel':
          message = `Your order ${ndrOrder.order.code} has been cancelled due to delivery issues. Refund will be processed accordingly.`;
          break;
      }

      if (comment) {
        message += ` Note: ${comment}`;
      }

      // Send WhatsApp notification to customer (if enabled)
      // This would need a generic text message since we don't have a specific template
      // For now, we'll log this action
      this.fastify.log.info(`NDR action taken for order ${ndrOrder.order.code}: ${actionType}`, {
        ndrOrderId,
        actionType,
        comment,
        customerPhone: ndrOrder.order.customer.phone
      });

      return {
        success: true,
        message: 'NDR action notification processed'
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: `Failed to handle NDR action notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}