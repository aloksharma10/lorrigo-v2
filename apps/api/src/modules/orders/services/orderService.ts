import { prisma } from '@lorrigo/db';
import type { Order, OrderStatus } from '@lorrigo/db';
import { CreateOrderSchema, UpdateOrderSchema } from '../validations';
import type { z } from 'zod';

/**
 * Order Service handles business logic related to orders
 */
export class OrderService {
  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(userId: string, queryParams: any) {
    const {
      page = 1,
      limit = 10,
      status,
      search = '',
      fromDate,
      toDate
    } = queryParams;

    const skip = (page - 1) * limit;

    // Build the where clause based on filters
    let where: any = {
      userId: userId
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add date range filter if provided
    if (fromDate || toDate) {
      where.createdAt = {};

      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }

      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      customerId: order.customerId,
      customerName: order.customer.name,
      createdAt: order.createdAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      orders: formattedOrders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(id: string, userId: string) {
    return prisma.order.findUnique({
      where: {
        id,
        userId
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        shippingAddress: true,
        returnAddress: true,
        shipments: {
          include: {
            courier: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        payments: true,
      },
    });
  }

  /**
   * Create a new order
   */
  async createOrder(data: z.infer<typeof CreateOrderSchema>, userId: string) {
    // Generate unique order number (format: ORD-YYYYMMDD-XXXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    const orderNumber = `ORD-${dateStr}-${randomStr}`;

    // Create order transaction to handle both order and invoice creation
    return prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          code: 'ORD-2505-00001',
          orderChannelConfig: {
            create: {
              code: 'ORD-2505-00001',
              channel: "CUSTOM",
              channelOrderId: orderNumber,
            }
          },
          orderNumber,
          status: 'CREATED',
          totalAmount: data.totalAmount,
          customer: {
            connect: { id: data.customerId },
          },
          user: {
            connect: { id: userId },
          },
          shippingAddress: {
            connect: { id: data.shippingAddressId },
          },
          ...(data.returnAddressId ? {
            returnAddress: {
              connect: { id: data.returnAddressId },
            }
          } : {}),
        },
      });

      // Create invoice for the order
      const invoiceNumber = `INV-${dateStr}-${randomStr}`;

      await tx.invoice.create({
        data: {
          code: invoiceNumber,
          invoiceNumber,
          amount: data.totalAmount,
          isPaid: false,
          dueDate: new Date(today.setDate(today.getDate() + 7)), // Due in 7 days
          user: {
            connect: { id: userId },
          },
          order: {
            connect: { id: order.id },
          },
        },
      });

      return order;
    });
  }

  /**
   * Update an order status
   */
  async updateOrderStatus(id: string, updateData: z.infer<typeof UpdateOrderSchema>) {
    return prisma.order.update({
      where: { id },
      data: {
        status: updateData.status as OrderStatus,
        ...(updateData.notes && { notes: updateData.notes }),
      },
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(id: string, userId: string, reason?: string) {
    // Check if order exists and belongs to the user
    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        shipments: true,
      },
    });

    if (!existingOrder) {
      return { error: 'Order not found' };
    }

    // Check if order can be cancelled
    if (!['CREATED', 'CONFIRMED'].includes(existingOrder.status)) {
      return { error: 'Cannot cancel order at this stage' };
    }

    // Check if there are any shipments in progress
    const hasShipmentsInProgress = existingOrder.shipments.some(
      shipment => !['CREATED', 'CANCELLED'].includes(shipment.status)
    );

    if (hasShipmentsInProgress) {
      return { error: 'Cannot cancel order with shipments in progress' };
    }

    // Update order status to CANCELLED and add reason to notes

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // Cancel any existing shipments in CREATED status
    await prisma.shipment.updateMany({
      where: {
        orderId: id,
        status: 'CREATED',
      },
      data: {
        // status: 'CANCELLED',
      },
    });

    return { order };
  }

  /**
   * Get order statistics
   */
  async getOrderStats(userId: string, period: string) {
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get total orders and amount
    const totalOrdersPromise = prisma.order.count({
      where: {
        userId: userId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const totalAmountPromise = prisma.order.aggregate({
      where: {
        userId: userId,
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Get count of orders by status
    const statusCountsPromise = prisma.order.groupBy({
      by: ['status'],
      where: {
        userId: userId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
    });

    // Wait for all promises to resolve
    const [totalOrders, totalAmountResult, statusCountsResult] = await Promise.all([
      totalOrdersPromise,
      totalAmountPromise,
      statusCountsPromise,
    ]);

    // Format status counts
    const statusCounts: Record<string, number> = {};
    statusCountsResult.forEach(item => {
      statusCounts[item.status] = item._count;
    });

    return {
      totalOrders,
      totalAmount: totalAmountResult._sum.totalAmount || 0,
      statusCounts: {
        CREATED: statusCounts.CREATED || 0,
        CONFIRMED: statusCounts.CONFIRMED || 0,
        PROCESSING: statusCounts.PROCESSING || 0,
        SHIPPED: statusCounts.SHIPPED || 0,
        DELIVERED: statusCounts.DELIVERED || 0,
        CANCELLED: statusCounts.CANCELLED || 0,
        RETURNED: statusCounts.RETURNED || 0,
      },
    };
  }
} 