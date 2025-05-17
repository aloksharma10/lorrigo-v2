import { prisma, ShipmentStatus } from '@lorrigo/db';
import type { z } from 'zod';
import { 
  CreateShipmentSchema, 
  UpdateShipmentSchema,
  AddTrackingEventSchema
} from '../validations';

/**
 * Service for handling shipment-related business logic
 */
export class ShipmentService {
  /**
   * Generate a unique tracking number
   */
  private generateTrackingNumber(): string {
    const prefix = 'LOR';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  /**
   * Create a new shipment
   */
  async createShipment(data: z.infer<typeof CreateShipmentSchema>, userId: string) {
    // Check if order exists and belongs to the user
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId,
      },
    });
    
    if (!order) {
      return { error: 'Order not found' };
    }
    
    // Check if hub exists and belongs to the user
    const hub = await prisma.hub.findFirst({
      where: {
        id: data.hubId,
        userId,
      },
    });
    
    if (!hub) {
      return { error: 'Hub not found' };
    }
    
    // Create shipment with tracking number
    const shipment = await prisma.shipment.create({
      data: {
        code: `SHP-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        awb: this.generateTrackingNumber(),
        weight: data.weight,
        status: ShipmentStatus.CREATED,
        order: {
          connect: {
            id: data.orderId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        hub: {
          connect: {
            id: data.hubId,
          },
        },
        courier: {
          connect: {
            id: data.courierId,
          },
        },
        trackingEvents: {
          create: {
            code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            status: ShipmentStatus.CREATED,
            location: hub.name,
            description: 'Shipment created and ready for pickup',
          },
        },
      },
      include: {
        order: true,
        hub: true,
        courier: true,
        trackingEvents: true,
      },
    });
    
    // Update order status if it's still in CREATED status
    if (order.status === 'CREATED') {
      await prisma.order.update({
        where: { id: data.orderId },
        data: { status: 'PROCESSING' },
      });
    }
    
    return { shipment };
  }
  
  /**
   * Get all shipments for a user
   */
  async getAllShipments(userId: string) {
    return prisma.shipment.findMany({
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
  }
  
  /**
   * Get shipment by ID
   */
  async getShipmentById(id: string, userId: string) {
    return prisma.shipment.findFirst({
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
  }
  
  /**
   * Update a shipment
   */
  async updateShipment(
    id: string, 
    userId: string,
    updateData: z.infer<typeof UpdateShipmentSchema>
  ) {
    // Verify shipment exists and belongs to user
    const existingShipment = await prisma.shipment.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!existingShipment) {
      return { error: 'Shipment not found' };
    }
    
    // Update the shipment
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        trackingEvents: true,
      },
    });
    
    // If status was updated, add a tracking event
    if (updateData.status && updateData.status !== existingShipment.status) {
      await prisma.trackingEvent.create({
        data: {
          code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          shipmentId: id,
          status: updateData.status as ShipmentStatus,
          location: 'System Update',
          description: `Shipment status updated to ${updateData.status}`,
        },
      });
      
      // Update order status based on shipment status
      if (updateData.status === 'DELIVERED') {
        await prisma.order.update({
          where: { id: existingShipment.orderId },
          data: { status: 'DELIVERED' },
        });
      } else if (updateData.status === 'IN_TRANSIT') {
        await prisma.order.update({
          where: { id: existingShipment.orderId },
          data: { status: 'SHIPPED' },
        });
      }
    }
    
    return { shipment: updatedShipment };
  }
  
  /**
   * Add a tracking event to a shipment
   */
  async addTrackingEvent(
    id: string,
    userId: string,
    eventData: z.infer<typeof AddTrackingEventSchema>
  ) {
    // Verify shipment exists and belongs to user
    const shipment = await prisma.shipment.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!shipment) {
      return { error: 'Shipment not found' };
    }
    
    // Create the tracking event
    const trackingEvent = await prisma.trackingEvent.create({
      data: {
        code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        shipmentId: id,
        status: eventData.status as ShipmentStatus,
        location: eventData.location,
        description: eventData.description,
      },
    });
    
    // Update shipment status
    await prisma.shipment.update({
      where: { id },
      data: { status: eventData.status as ShipmentStatus },
    });
    
    // Update order status based on tracking event
    if (eventData.status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED' },
      });
    } else if (eventData.status === 'IN_TRANSIT') {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'SHIPPED' },
      });
    }
    
    return { trackingEvent };
  }
  
  /**
   * Get tracking events for a shipment
   */
  async getTrackingEvents(id: string, userId: string) {
    // Verify shipment exists and belongs to user
    const shipment = await prisma.shipment.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!shipment) {
      return { error: 'Shipment not found' };
    }
    
    // Get tracking events
    const trackingEvents = await prisma.trackingEvent.findMany({
      where: {
        shipmentId: id,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    
    return { trackingEvents };
  }
  
  /**
   * Cancel a shipment
   */
  async cancelShipment(id: string, userId: string) {
    // Verify shipment exists and belongs to user
    const shipment = await prisma.shipment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        order: true,
      },
    });
    
    if (!shipment) {
      return { error: 'Shipment not found' };
    }
    
    // Check if shipment can be cancelled (not already delivered or returned)
    if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
      return { 
        error: `Shipment cannot be cancelled because it is already ${shipment.status.toLowerCase()}` 
      };
    }
    
    // Update shipment status to EXCEPTION
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: { status: 'EXCEPTION' },
    });
    
    // Add tracking event for cancellation
    await prisma.trackingEvent.create({
      data: {
        code: `ST-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        shipmentId: id,
        status: ShipmentStatus.EXCEPTION,
        location: 'System',
        description: 'Shipment cancelled by seller',
      },
    });
    
    // If this was the only shipment for the order, update order status
    const otherShipments = await prisma.shipment.findMany({
      where: {
        orderId: shipment.orderId,
        id: { not: id },
        status: { notIn: ['EXCEPTION', 'CANCELLED'] },
      },
    });
    
    if (otherShipments.length === 0) {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'CANCELLED' },
      });
    }
    
    return { shipment: updatedShipment };
  }
  
  /**
   * Get shipment statistics
   */
  async getShipmentStats(userId: string) {
    // Get count of shipments by status
    const statusCounts = await prisma.shipment.groupBy({
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
    
    const recentShipments = await prisma.shipment.count({
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
    
    return {
      total: Object.values(statsByStatus).reduce((a, b) => a + b, 0),
      byStatus: statsByStatus,
      recentShipments,
    };
  }
} 