import { FastifyInstance } from 'fastify';
import { WhatsAppService } from '@/lib/whatsapp';
import { WhatsAppQueueService } from '@/lib/whatsapp-queue.service';

export default async function whatsappRoutes(fastify: FastifyInstance) {
  const whatsAppQueueService = new WhatsAppQueueService(fastify);

  // Get WhatsApp service status
  fastify.get('/status', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Get WhatsApp service status',
      response: {
        200: {
          type: 'object',
          properties: {
            configured: { type: 'boolean' },
            baseUrl: { type: 'string' },
            deviceId: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const whatsappService = new WhatsAppService(fastify);
        const status = whatsappService.getStatus();
        
        return reply.code(200).send(status);
      } catch (error) {
        return reply.code(500).send({
          configured: false,
          baseUrl: '',
          deviceId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Send tracking notification (for testing)
  fastify.post('/tracking-notification', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Send tracking notification (test)',
      body: {
        type: 'object',
        required: ['shipmentId', 'event'],
        properties: {
          shipmentId: { type: 'string' },
          event: { 
            type: 'string',
            enum: ['courier_assigned', 'pickup_scheduled', 'out_for_delivery', 'delivered']
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            jobId: { type: 'string' },
          },
        },
      },
    },
    preHandler: async (request, reply) => {
      try {
        // Add basic auth check here if needed
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
      } catch (error) {
        return reply.code(401).send({ error: 'Authentication failed' });
      }
    },
    handler: async (request, reply) => {
      try {
        const { shipmentId, event } = request.body as any;
        
        // Get shipment with related data
        const shipment = await fastify.prisma.shipment.findUnique({
          where: { id: shipmentId },
          include: {
            order: {
              include: {
                user: { select: { phone: true } },
                customer: { select: { id: true, phone: true, name: true } },
                items: { select: { name: true, units: true } }
              }
            },
            courier: { select: { name: true } }
          }
        });

        if (!shipment) {
          return reply.code(404).send({
            success: false,
            message: 'Shipment not found'
          });
        }

        // Create tracking notification service and send notification
        const { TrackingNotificationService } = await import('@/lib/tracking-notifications');
        const trackingService = new TrackingNotificationService(fastify);

        // Build items description for testing
        const buildItemsDescription = (items: Array<{ name: string | null; units: number | null }>): string => {
          if (!items || items.length === 0) return 'your items';
          if (items.length === 1) {
            const item = items[0];
            const name = item?.name || 'item';
            const units = item?.units || 1;
            return units > 1 ? `${units}x ${name}` : name;
          }
          return items.map(item => {
            const name = item.name || 'item';
            const units = item.units || 1;
            return units > 1 ? `${units}x ${name}` : name;
          }).join(', ');
        };

        const result = await trackingService.sendCustomerTrackingNotification(
          event as any,
          {
            orderId: shipment.order.id,
            orderNumber: shipment.order.code,
            customerPhone: shipment.order.customer.phone,
            sellerPhone: shipment.order.user.phone,
            customerName: shipment.order.customer.name,
            itemsDescription: buildItemsDescription(shipment.order.items),
            awb: shipment.awb!,
            courierName: shipment.courier?.name,
            trackingUrl: `${process.env.FRONTEND_URL}/track/${shipment.awb}`,
            edd: shipment.edd?.toISOString(),
            userId: shipment.order.user_id,
            customerId: shipment.order.customer.id,
          }
        );

        return reply.code(200).send(result);
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Send NDR notification (for testing)
  fastify.post('/ndr-notification', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Send NDR notification (test)',
      body: {
        type: 'object',
        required: ['ndrOrderId'],
        properties: {
          ndrOrderId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: async (request, reply) => {
      try {
        // Add basic auth check here if needed
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
      } catch (error) {
        return reply.code(401).send({ error: 'Authentication failed' });
      }
    },
    handler: async (request, reply) => {
      try {
        const { ndrOrderId } = request.body as any;
        
        // Create NDR notification service and send notification
        const { NDRNotificationService } = await import('../shipments/services/ndr-notification.service');
        const ndrService = new NDRNotificationService(fastify);

        const result = await ndrService.handleNDRCreated(ndrOrderId);

        return reply.code(200).send(result);
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Queue statistics route
  fastify.get('/queue/stats', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Get WhatsApp notification queue statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            waiting: { type: 'number' },
            active: { type: 'number' },
            completed: { type: 'number' },
            failed: { type: 'number' },
            delayed: { type: 'number' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const stats = await whatsAppQueueService.getQueueStats();
        return reply.code(200).send(stats);
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to get queue statistics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}