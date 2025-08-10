import { FastifyInstance } from 'fastify';
import { NotificationService } from './notification';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { 
  NotificationType, 
  NotificationPriority, 
  WhatsAppNotificationPayload, 
  TrackingNotificationData 
} from '@/types/notification';
import { WhatsAppTemplates, WhatsAppTemplateKey } from './whatsapp';
import { captureException } from './sentry';
import { ShipmentStatus } from '@lorrigo/db';

export class TrackingNotificationService {
  private fastify: FastifyInstance;
  private notificationService: NotificationService;
  private whatsappQueueService: WhatsAppQueueService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.notificationService = new NotificationService(fastify);
    this.whatsappQueueService = new WhatsAppQueueService(fastify);
  }

  /**
   * Send tracking notification to customer (queued)
   */
  async sendCustomerTrackingNotification(
    event: 'courier_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered',
    data: TrackingNotificationData
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      // Quick check if customer wants WhatsApp notifications (optimization for queue)
      const userProfile = await this.getUserProfile(data.userId);
      if (!userProfile || !this.shouldSendWhatsAppNotification(userProfile.notification_settings)) {
        return {
          success: true,
          message: 'WhatsApp notifications disabled for user',
        };
      }

      // Queue the notification for async processing
      return await this.whatsappQueueService.queueTrackingNotification(event, data, {
        priority: 1, // High priority for customer notifications
        userId: data.userId,
      });
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to queue customer tracking notification',
      };
    }
  }

  /**
   * Send NDR notification to seller (queued)
   */
  async sendSellerNDRNotification(
    data: TrackingNotificationData
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      // Quick check if seller wants WhatsApp notifications
      const userProfile = await this.getUserProfile(data.userId);
      if (!userProfile || !this.shouldSendWhatsAppNotification(userProfile.notification_settings)) {
        return {
          success: true,
          message: 'WhatsApp notifications disabled for seller',
        };
      }

      // For NDR notifications, we can use a direct template message queue
      const template = WhatsAppTemplates.NDR_NOTIFICATION;
      
      if (!template.id) {
        return {
          success: false,
          message: 'NDR template ID not configured',
        };
      }

      const variables = [
        data.awb || '',
        data.orderNumber,
        data.ndrReason || 'Customer unavailable',
      ];

      return await this.whatsappQueueService.queueTemplateMessage(
        data.sellerPhone,
        template.id,
        variables,
        {
          priority: 2, // Higher priority for NDR (urgent)
          metadata: {
            event: 'ndr',
            orderId: data.orderId,
            awb: data.awb,
            ndrReason: data.ndrReason,
            userId: data.userId,
          },
        }
      );
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to queue seller NDR notification',
      };
    }
  }

  /**
   * Handle shipment status change and trigger appropriate notifications
   */
  async handleShipmentStatusChange(
    shipmentId: string,
    oldStatus: ShipmentStatus,
    newStatus: ShipmentStatus,
    shipmentData: {
      awb?: string;
      order: {
        id: string;
        code: string;
        user_id: string;
        customer: {
          id: string;
          phone: string;
          name: string;
        };
        items: Array<{
          name: string | null;
          units: number | null;
        }>;
      };
      courier?: {
        name: string;
      } | null;
      edd?: Date;
    }
  ): Promise<{ notifications: number; errors: string[] }> {
    const notifications = [];
    const errors = [];

    try {
      // Get user phone for seller notifications
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: shipmentData.order.user_id },
        select: { phone: true },
      });

      if (!user) {
        errors.push('User not found');
        return { notifications: 0, errors };
      }

      // Build items description
      const itemsDescription = this.buildItemsDescription(shipmentData.order.items);

      const trackingData: TrackingNotificationData = {
        orderId: shipmentData.order.id,
        orderNumber: shipmentData.order.code,
        customerPhone: shipmentData.order.customer.phone,
        sellerPhone: user.phone,
        customerName: shipmentData.order.customer.name,
        itemsDescription,
        awb: shipmentData.awb,
        courierName: shipmentData.courier?.name,
        trackingUrl: this.buildTrackingUrl(shipmentData.awb),
        edd: shipmentData.edd ? new Date(shipmentData.edd).toLocaleDateString('en-IN', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : undefined,
        userId: shipmentData.order.user_id,
        customerId: shipmentData.order.customer.id,
      };

      // Handle customer notifications based on status change
      const customerEvent = this.mapStatusToCustomerEvent(newStatus);
      if (customerEvent) {
        const result = await this.sendCustomerTrackingNotification(customerEvent, trackingData);
        if (result.success) {
          notifications.push(result);
        } else {
          errors.push(`Customer notification failed: ${result.message}`);
        }
      }

      // Handle NDR notifications for sellers
      if (this.isNDRStatus(newStatus)) {
        // Get NDR reason from the database
        const ndrOrder = await this.fastify.prisma.nDROrder.findFirst({
          where: { shipment_id: shipmentId },
          orderBy: { created_at: 'desc' },
        });

        trackingData.ndrReason = ndrOrder?.cancellation_reason || 'Delivery attempt failed';

        const result = await this.sendSellerNDRNotification(trackingData);
        if (result.success) {
          notifications.push(result);
        } else {
          errors.push(`NDR notification failed: ${result.message}`);
        }
      }

      return { notifications: notifications.length, errors };
    } catch (error) {
      captureException(error as Error);
      errors.push(`Error handling status change: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { notifications: 0, errors };
    }
  }

  /**
   * Get user profile with notification settings
   */
  private async getUserProfile(userId: string) {
    try {
      return await this.fastify.prisma.userProfile.findUnique({
        where: { user_id: userId },
        select: { notification_settings: true },
      });
    } catch (error) {
      captureException(error as Error);
      return null;
    }
  }

  /**
   * Check if user has WhatsApp notifications enabled
   */
  private shouldSendWhatsAppNotification(notificationSettings: any): boolean {
    try {
      if (typeof notificationSettings === 'object' && notificationSettings !== null) {
        return notificationSettings.whatsapp === true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Map shipment status to customer notification event
   */
  private mapStatusToCustomerEvent(status: ShipmentStatus): 'courier_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | null {
    switch (status) {
      case ShipmentStatus.COURIER_ASSIGNED:
        return 'courier_assigned';
      case ShipmentStatus.PICKED_UP:
        return 'picked_up';
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return 'out_for_delivery';
      case ShipmentStatus.DELIVERED:
        return 'delivered';
      default:
        return null;
    }
  }

  /**
   * Get template key for customer events
   */
  private getCustomerTemplateKey(event: string): WhatsAppTemplateKey {
    switch (event) {
      case 'courier_assigned':
        return 'COURIER_ASSIGNED';
      case 'picked_up':
        return 'PICKED_UP';
      case 'out_for_delivery':
        return 'OUT_FOR_DELIVERY';
      case 'delivered':
        return 'DELIVERED';
      default:
        throw new Error(`Unknown customer event: ${event}`);
    }
  }

  /**
   * Build variables array for customer notifications
   */
  private buildCustomerVariables(event: string, data: TrackingNotificationData): string[] {
    const customerName = data.customerName || 'Customer';
    const orderNumber = data.orderNumber;
    const itemsDescription = data.itemsDescription || 'your items';
    const courierName = data.courierName || 'our delivery partner';
    const trackingUrl = data.trackingUrl || '';
    const edd = data.edd || 'TBD';

    switch (event) {
      case 'courier_assigned':
        // ready_for_dispatch: {{1}} name, {{2}} order number, {{3}} items, {{4}} courier
        return [
          customerName,
          orderNumber,
          itemsDescription,
          courierName,
        ];
      case 'picked_up':
        // order_shipped: {{1}} name, {{2}} order number, {{3}} items, {{4}} courier, {{5}} expected delivery
        return [
          customerName,
          orderNumber,
          itemsDescription,
          courierName,
          edd,
        ];
      case 'out_for_delivery':
        // out_for_delivery: {{1}} name, {{2}} order number, {{3}} items, {{4}} tracking URL
        return [
          customerName,
          orderNumber,
          itemsDescription,
          trackingUrl,
        ];
      case 'delivered':
        // order_delivered: {{1}} name, {{2}} order number, {{3}} items
        return [
          customerName,
          orderNumber,
          itemsDescription,
        ];
      default:
        return [];
    }
  }

  /**
   * Check if status indicates NDR
   */
  private isNDRStatus(status: ShipmentStatus): boolean {
    return status === ShipmentStatus.NDR;
  }

  /**
   * Build tracking URL for customer
   */
  private buildTrackingUrl(awb?: string): string {
    if (!awb) return '';
    const baseUrl = process.env.FRONTEND_URL || 'https://lorrigo.com';
    return `${baseUrl}/track/${awb}`;
  }

  /**
   * Build items description from order items
   */
  private buildItemsDescription(items: Array<{ name: string | null; units: number | null }>): string {
    if (!items || items.length === 0) {
      return 'your items';
    }

    if (items.length === 1) {
      const item = items[0];
      if (!item) return 'item';
      const name = item.name || 'item';
      const units = item.units || 1;
      return units > 1 ? `${units}x ${name}` : name;
    }

    if (items.length <= 3) {
      return items
        .map(item => {
          if (!item) return 'item';
          const name = item.name || 'item';
          const units = item.units || 1;
          return units > 1 ? `${units}x ${name}` : name;
        })
        .join(', ');
    }

    // For more than 3 items, show first 2 and count
    const firstTwo = items.slice(0, 2)
      .map(item => {
        if (!item) return 'item';
        const name = item.name || 'item';
        const units = item.units || 1;
        return units > 1 ? `${units}x ${name}` : name;
      })
      .join(', ');
    
    return `${firstTwo} and ${items.length - 2} more items`;
  }
}