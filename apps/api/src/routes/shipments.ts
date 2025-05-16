import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@lorrigo/db';
// import { authenticateUser } from '../middleware/auth';
import { ShipmentStatus, TrackingEvent } from '@lorrigo/db';

// Validation schemas
const createShipmentSchema = z.object({
  orderId: z.string(),
  weight: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  hubId: z.string(),
  courierId: z.string(),
});

const updateShipmentSchema = z.object({
  status: z.enum([
    'CREATED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'UNDELIVERED',
    'RETURNED',
    'EXCEPTION'
  ]).optional(),
  trackingUrl: z.string().url().optional(),
});

const addTrackingEventSchema = z.object({
  location: z.string(),
  description: z.string(),
  status: z.enum([
    'CREATED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'UNDELIVERED',
    'RETURNED',
    'EXCEPTION'
  ]),
});

// Generate a unique tracking number
const generateTrackingNumber = () => {
  const prefix = 'LOR';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${timestamp}${random}`;
};

// Route definitions
export default async function shipmentRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', fastify.authenticate);

  // Create a new shipment
  // fastify.post('/', async (request, reply) => {
  //   try {
  //     const { orderId, weight, dimensions, hubId, courierId } = createShipmentSchema.parse(request.body);
      
  //     // Get userId from auth token
  //     const userId = request.user.id;
      
  //     // Check if order exists and belongs to the user
  //     const order = await fastify.prisma.order.findFirst({
  //       where: {
  //         id: orderId,
  //         userId,
  //       },
  //     });
      
  //     if (!order) {
  //       return reply.code(404).send({ error: 'Order not found' });
  //     }
      
  //     // Check if hub exists and belongs to the user
  //     const hub = await fastify.prisma.hub.findFirst({
  //       where: {
  //         id: hubId,
  //         userId,
  //       },
  //     });
      
  //     if (!hub) {
  //       return reply.code(404).send({ error: 'Hub not found' });
  //     }
      
  //     // Create shipment with tracking number
  //     const shipment = await fastify.prisma.shipment.create({
  //       data: {
  //         trackingNumber: generateTrackingNumber(),
  //         weight,
  //         dimensions: dimensions ? dimensions : undefined,
  //         status: ShipmentStatus.CREATED,
  //         order: {
  //           connect: {
  //             id: orderId,
  //           },
  //         },
  //         user: {
  //           connect: {
  //             id: userId,
  //           },
  //         },
  //         hub: {
  //           connect: {
  //             id: hubId,
  //           },
  //         },
  //         courier: {
  //           connect: {
  //             id: courierId,
  //           },
  //         },
  //         trackingEvents: {
  //           create: {
  //             status: ShipmentStatus.CREATED,
  //             location: hub.name,
  //             description: 'Shipment created and ready for pickup',
  //           },
  //         },
  //       },
  //       include: {
  //         order: true,
  //         hub: true,
  //         courier: true,
  //         trackingEvents: true,
  //       },
  //     });
      
  //     // Update order status if it's still in CREATED status
  //     if (order.status === 'CREATED') {
  //       await fastify.prisma.order.update({
  //         where: { id: orderId },
  //         data: { status: 'PROCESSING' },
  //       });
  //     }
      
  //     return reply.code(201).send(shipment);
  //   } catch (error) {
  //     if (error instanceof z.ZodError) {
  //       return reply.code(400).send({ error: error.errors });
  //     }
  //     request.log.error(error);
  //     return reply.code(500).send({ error: 'Internal Server Error' });
  //   }
  // });

  // Get all shipments for a user
  fastify.get('/', async (request, reply) => {
    try {
      const userId = request.user.id;
      
      const shipments = await fastify.prisma.shipment.findMany({
        where: {
          userId,
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              customer: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          hub: {
            select: {
              name: true,
              code: true,
            },
          },
          courier: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return reply.send(shipments);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get a specific shipment by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user.id;
      
      const shipment = await fastify.prisma.shipment.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          order: {
            include: {
              customer: true,
              shippingAddress: true,
            },
          },
          hub: true,
          courier: true,
          trackingEvents: {
            orderBy: {
              timestamp: 'desc',
            },
          },
        },
      });
      
      if (!shipment) {
        return reply.code(404).send({ error: 'Shipment not found' });
      }
      
      return reply.send(shipment);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Update a shipment
  // fastify.patch('/:id', async (request, reply) => {
  //   try {
  //     const { id } = request.params as { id: string };
  //     const updateData = updateShipmentSchema.parse(request.body);
  //     const userId = request.user.id;
      
  //     // Verify shipment exists and belongs to user
  //     const existingShipment = await fastify.prisma.shipment.findFirst({
  //       where: {
  //         id,
  //         userId,
  //       },
  //     });
      
  //     if (!existingShipment) {
  //       return reply.code(404).send({ error: 'Shipment not found' });
  //     }
      
  //     // Update the shipment
  //     const updatedShipment = await fastify.prisma.shipment.update({
  //       where: { id },
  //       data: updateData,
  //       include: {
  //         order: true,
  //         trackingEvents: true,
  //       },
  //     });
      
  //     // If status was updated, add a tracking event
  //     if (updateData.status && updateData.status !== existingShipment.status) {
  //       await fastify.prisma.trackingEvent.create({
  //         data: {
  //           shipmentId: id,
  //           status: updateData.status as ShipmentStatus,
  //           location: 'System Update',
  //           description: `Shipment status updated to ${updateData.status}`,
  //         },
  //       });
        
  //       // Update order status based on shipment status
  //       if (updateData.status === 'DELIVERED') {
  //         await fastify.prisma.order.update({
  //           where: { id: existingShipment.orderId },
  //           data: { status: 'DELIVERED' },
  //         });
  //       } else if (updateData.status === 'SHIPPED' || updateData.status === 'IN_TRANSIT') {
  //         await fastify.prisma.order.update({
  //           where: { id: existingShipment.orderId },
  //           data: { status: 'SHIPPED' },
  //         });
  //       }
  //     }
      
  //     return reply.send(updatedShipment);
  //   } catch (error) {
  //     if (error instanceof z.ZodError) {
  //       return reply.code(400).send({ error: error.errors });
  //     }
  //     request.log.error(error);
  //     return reply.code(500).send({ error: 'Internal Server Error' });
  //   }
  // });

  // Add a tracking event to a shipment
  // fastify.post('/:id/tracking', async (request, reply) => {
  //   try {
  //     const { id } = request.params as { id: string };
  //     const { location, description, status } = addTrackingEventSchema.parse(request.body);
  //     const userId = request.user.id;
      
  //     // Verify shipment exists and belongs to user
  //     const shipment = await fastify.prisma.shipment.findFirst({
  //       where: {
  //         id,
  //         userId,
  //       },
  //     });
      
  //     if (!shipment) {
  //       return reply.code(404).send({ error: 'Shipment not found' });
  //     }
      
  //     // Create the tracking event
  //     const trackingEvent = await fastify.prisma.trackingEvent.create({
  //       data: {
  //         shipmentId: id,
  //         status: status as ShipmentStatus,
  //         location,
  //         description,
  //       },
  //     });
      
  //     // Update shipment status
  //     await fastify.prisma.shipment.update({
  //       where: { id },
  //       data: { status: status as ShipmentStatus },
  //     });
      
  //     // Update order status based on tracking event
  //     if (status === 'DELIVERED') {
  //       await fastify.prisma.order.update({
  //         where: { id: shipment.orderId },
  //         data: { status: 'DELIVERED' },
  //       });
  //     } else if (status === 'SHIPPED' || status === 'IN_TRANSIT') {
  //       await fastify.prisma.order.update({
  //         where: { id: shipment.orderId },
  //         data: { status: 'SHIPPED' },
  //       });
  //     }
      
  //     return reply.code(201).send(trackingEvent);
  //   } catch (error) {
  //     if (error instanceof z.ZodError) {
  //       return reply.code(400).send({ error: error.errors });
  //     }
  //     request.log.error(error);
  //     return reply.code(500).send({ error: 'Internal Server Error' });
  //   }
  // });

  // // Get tracking events for a shipment
  // fastify.get('/:id/tracking', async (request, reply) => {
  //   try {
  //     const { id } = request.params as { id: string };
  //     const userId = request.user.id;
      
  //     // Verify shipment exists and belongs to user
  //     const shipment = await fastify.prisma.shipment.findFirst({
  //       where: {
  //         id,
  //         userId,
  //       },
  //     });
      
  //     if (!shipment) {
  //       return reply.code(404).send({ error: 'Shipment not found' });
  //     }
      
  //     // Get tracking events
  //     const trackingEvents = await fastify.prisma.trackingEvent.findMany({
  //       where: {
  //         shipmentId: id,
  //       },
  //       orderBy: {
  //         timestamp: 'desc',
  //       },
  //     });
      
  //     return reply.send(trackingEvents);
  //   } catch (error) {
  //     request.log.error(error);
  //     return reply.code(500).send({ error: 'Internal Server Error' });
  //   }
  // });

  // // Cancel a shipment
  // fastify.post('/:id/cancel', async (request, reply) => {
  //   try {
  //     const { id } = request.params as { id: string };
  //     const userId = request.user.id;
      
  //     // Verify shipment exists and belongs to user
  //     const shipment = await fastify.prisma.shipment.findFirst({
  //       where: {
  //         id,
  //         userId,
  //       },
  //       include: {
  //         order: true,
  //       },
  //     });
      
  //     if (!shipment) {
  //       return reply.code(404).send({ error: 'Shipment not found' });
  //     }
      
  //     // Check if shipment can be cancelled (not already delivered or returned)
  //     if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
  //       return reply.code(400).send({ 
  //         error: `Shipment cannot be cancelled because it is already ${shipment.status.toLowerCase()}` 
  //       });
  //     }
      
  //     // Update shipment status to EXCEPTION
  //     const updatedShipment = await fastify.prisma.shipment.update({
  //       where: { id },
  //       data: { status: 'EXCEPTION' },
  //     });
      
  //     // Add tracking event for cancellation
  //     await fastify.prisma.trackingEvent.create({
  //       data: {
  //         shipmentId: id,
  //         status: ShipmentStatus.EXCEPTION,
  //         location: 'System',
  //         description: 'Shipment cancelled by seller',
  //       },
  //     });
      
  //     // If this was the only shipment for the order, update order status
  //     const otherShipments = await fastify.prisma.shipment.findMany({
  //       where: {
  //         orderId: shipment.orderId,
  //         id: { not: id },
  //         status: { notIn: ['EXCEPTION', 'CANCELLED'] },
  //       },
  //     });
      
  //     if (otherShipments.length === 0) {
  //       await fastify.prisma.order.update({
  //         where: { id: shipment.orderId },
  //         data: { status: 'CANCELLED' },
  //       });
  //     }
      
  //     return reply.send(updatedShipment);
  //   } catch (error) {
  //     request.log.error(error);
  //     return reply.code(500).send({ error: 'Internal Server Error' });
  //   }
  // });

  // Get shipment statistics
  fastify.get('/stats/summary', async (request, reply) => {
    try {
      const userId = request.user.id;
      
      // Get count of shipments by status
      const statusCounts = await fastify.prisma.shipment.groupBy({
        by: ['status'],
        where: {
          userId,
        },
        _count: {
          id: true,
        },
      });
      
      // Get count of recent shipments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentShipments = await fastify.prisma.shipment.count({
        where: {
          userId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });
      
      // Format the response
      const statsByStatus = Object.fromEntries(
        statusCounts.map(item => [item.status, item._count.id])
      );
      
      return reply.send({
        total: Object.values(statsByStatus).reduce((a, b) => a + b, 0),
        byStatus: statsByStatus,
        recentShipments,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
} 