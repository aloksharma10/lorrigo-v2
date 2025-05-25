import { prisma } from '@lorrigo/db';
import type { Channel, Order, OrderStatus, PaymentMethod } from '@lorrigo/db';
import { OrderFormValues, UpdateOrderFormValues } from '../validations';
import type { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { generateId, getFinancialYear } from '@lorrigo/utils';

/**
 * Order Service handles business logic related to orders
 */
export class OrderService {
  constructor(private fastify: FastifyInstance) { }

  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(userId: string, queryParams: any) {
    const { page = 1, limit = 10, status, search = '', from_date, to_date } = queryParams;

    const skip = (page - 1) * limit;

    // Build the where clause based on filters
    let where: any = {
      user_id: userId,
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add date range filter if provided
    if (from_date || to_date) {
      where.created_at = {};

      if (from_date) {
        where.created_at.gte = new Date(from_date);
      }

      if (to_date) {
        where.created_at.lte = new Date(to_date);
      }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      this.fastify.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
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
    const formatted_orders = orders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      customer_id: order.customer_id,
      customer_name: order.customer.name,
      created_at: order.created_at,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      orders: formatted_orders,
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
    return this.fastify.prisma.order.findUnique({
      where: {
        id,
        user_id: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        billing_address: true,
        shipments: {
          include: {
            courier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: true,
      },
    });
  }

  /**
   * Create a new order
   */
  async createOrder(data: OrderFormValues, userId: string) {
    // Generate unique order number (format: ORD-YYYYMMDD-XXXX)
    const today = new Date();
    const date_str = today.toISOString().slice(0, 10).replace(/-/g, '');
    const random_str = Math.floor(1000 + Math.random() * 9000).toString();
    const order_number = `ORD-${date_str}-${random_str}`;
    const order_code = generateId({
      tableName: 'order',
      entityName: order_number,
      lastUsedFinancialYear: getFinancialYear(new Date()),
      lastSequenceNumber: 0,
    }).id;

    // Create order transaction to handle both order and invoice creation
    return this.fastify.prisma.$transaction(async (tx) => {

      const customer = await tx.customer.upsert({
        where: {
          phone: data.deliveryDetails.mobileNumber,
        },
        update: {
        },
        create: {
          code: generateId({
            tableName: 'customer',
            entityName: data.deliveryDetails.fullName,
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: 0,
          }).id,
          name: data.deliveryDetails.fullName,
          email: data.deliveryDetails.email,
          phone: data.deliveryDetails.mobileNumber,
        },
      });

      const billing_address = await tx.address.create({
        data: {
          code: generateId({
            tableName: 'address',
            entityName: data.sellerDetails.sellerName,
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: 0,
          }).id,
          name: data.sellerDetails.sellerName,
          country: data.sellerDetails.isAddressAvailable ? data.sellerDetails.country : 'India',
          address: data.sellerDetails.address || '',
          city: data.sellerDetails.city || '',
          state: data.sellerDetails.state || '',
          pincode: data.sellerDetails.pincode || '',
        },
      });

      const last_order = await tx.order.findFirst({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          created_at: true,
        },
      });

      const volumetric_weight = Number((Number(data.packageDetails.length) * Number(data.packageDetails.breadth) * Number(data.packageDetails.height)) / 5000);
      // Create the order
      const order = await tx.order.create({
        data: {
          code: order_code,
          order_channel_config: {
            create: {
              code: order_code,
              channel: data.orderChannel as Channel || 'CUSTOM',
              channel_order_id: order_number,
            },
          },
          order_number: order_number,
          status: 'CREATED',
          total_amount: data.productDetails.products.reduce((acc, item) => acc + (item.price * item.quantity), 0),
          amount_to_collect: data.amountToCollect,
          payment_mode: data.paymentMethod.paymentMethod as PaymentMethod || 'COD',
          bucket: 0,
          ewaybill: data.ewaybill,
          items: {
            create: data.productDetails.products.map((item) => ({
              code: generateId({
                tableName: 'order_item',
                entityName: item.name,
                lastUsedFinancialYear: getFinancialYear(last_order?.created_at || new Date()),
                lastSequenceNumber: 0,
              }).id,
              name: item.name,
              sku: item.sku,
              units: item.quantity,
              selling_price: item.price,
              tax: item.taxRate,
              hsn: item.hsnCode,
            })),
          },
          package: {
            create: {
              code: generateId({
                tableName: 'package',
                entityName: order_number,
                lastUsedFinancialYear: getFinancialYear(last_order?.created_at || new Date()),
                lastSequenceNumber: 0,
              }).id,
              weight: Number(data.packageDetails.deadWeight),
              dead_weight: Number(data.packageDetails.deadWeight),
              volumetric_weight: volumetric_weight,
              length: Number(data.packageDetails.length),
              breadth: Number(data.packageDetails.breadth),
              height: Number(data.packageDetails.height),
            },
          },
          customer: {
            connect: { id: customer.id },
          },
          user: {
            connect: { id: userId },
          },
          billing_address: {
            connect: { id: billing_address.id },
          },
          hub: {
            connect: { id: data.pickupAddressId },
          },
        },
      });

      // Create invoice for the order
      // const invoice_number = `INV-${date_str}-${random_str}`;

      // await tx.invoice.create({
      //   data: {
      //     code: invoice_number,
      //     invoice_number: invoice_number,
      //     amount: data.total_amount,
      //     is_paid: false,
      //     due_date: new Date(today.setDate(today.getDate() + 7)), // Due in 7 days
      //     user: {
      //       connect: { id: userId },
      //     },
      //     order: {
      //       connect: { id: order.id },
      //     },
      //   },
      // });

      return order;
    });
  }

  /**
   * Update an order status
   */
  async updateOrderStatus(id: string, update_data: UpdateOrderFormValues) {
    return this.fastify.prisma.order.update({
      where: { id },
      data: {
        status: update_data.status as OrderStatus,
      },
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(id: string, user_id: string, reason?: string) {
    // Check if order exists and belongs to the user
    const existingOrder = await this.fastify.prisma.order.findUnique({
      where: {
        id,
        user_id: user_id,
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
      (shipment) => !['CREATED', 'CANCELLED'].includes(shipment.status)
    );

    if (hasShipmentsInProgress) {
      return { error: 'Cannot cancel order with shipments in progress' };
    }

    // Update order status to CANCELLED and add reason to notes
    const order = await this.fastify.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // Cancel any existing shipments in CREATED status
    await this.fastify.prisma.shipment.updateMany({
      where: {
        order_id: id,
        status: 'CREATED',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    return { order };
  }

  /**
   * Get order statistics
   */
  async getOrderStats(user_id: string, period: string) {
    // Calculate date range based on period
    const now = new Date();
    let start_date = new Date();

    switch (period) {
      case 'day':
        start_date.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start_date.setDate(now.getDate() - 7);
        break;
      case 'month':
        start_date.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start_date.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get total orders and amount
    const total_orders_promise = this.fastify.prisma.order.count({
      where: {
        user_id: user_id,
        created_at: {
          gte: start_date,
        },
      },
    });

    const total_amount_promise = this.fastify.prisma.order.aggregate({
      where: {
        user_id: user_id,
        created_at: {
          gte: start_date,
        },
      },
      _sum: {
        total_amount: true,
      },
    });

    // Get count of orders by status
    const status_counts_promise = this.fastify.prisma.order.groupBy({
      by: ['status'],
      where: {
        user_id: user_id,
        created_at: {
          gte: start_date,
        },
      },
      _count: {
        id: true,
      },
    });

    // Wait for all promises to resolve
    const [total_orders, total_amount_result, status_counts_result] = await Promise.all([
      total_orders_promise,
      total_amount_promise,
      status_counts_promise,
    ]);

    // Format status counts
    const status_counts: Record<string, number> = {};
    status_counts_result.forEach((item) => {
      status_counts[item.status] = item._count.id || 0;
    });

    return {
      total_orders,
      total_amount: total_amount_result._sum.total_amount || 0,
      status_counts: {
        CREATED: status_counts.CREATED || 0,
        CONFIRMED: status_counts.CONFIRMED || 0,
        PROCESSING: status_counts.PROCESSING || 0,
        SHIPPED: status_counts.SHIPPED || 0,
        DELIVERED: status_counts.DELIVERED || 0,
        CANCELLED: status_counts.CANCELLED || 0,
        RETURNED: status_counts.RETURNED || 0,
      },
    };
  }
}
