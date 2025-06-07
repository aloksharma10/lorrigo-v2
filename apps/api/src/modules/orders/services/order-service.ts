import { getPincodeDetails } from '@/utils/pincode';
import { Prisma, prisma } from '@lorrigo/db';
import type { Channel, OrderStatus, PaymentMethod } from '@lorrigo/db';
import { generateId, getFinancialYear, OrderFormValues, UpdateOrderFormValues } from '@lorrigo/utils';
import { FastifyInstance } from 'fastify';

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
  async createOrder(data: OrderFormValues, userId: string, userName: string) {
    try {
      // Create order transaction with parallel operations where possible
      return await this.fastify.prisma.$transaction(async (tx) => {
        const orderNumber = data.orderId;
        // Get pincode details for customer, billing address
        const [sellerPincode, customerPincode, volumetricWeight] = await Promise.all([
          getPincodeDetails(Number(data.sellerDetails.pincode ? data.sellerDetails.pincode : "000000")),
          getPincodeDetails(Number(data.deliveryDetails.billingIsSameAsDelivery ? data.deliveryDetails.billingPincode : data.deliveryDetails.pincode)),
          Promise.resolve(Number((Number(data.packageDetails.length) *
            Number(data.packageDetails.breadth) *
            Number(data.packageDetails.height)) / 5000))
        ]);

        // Parallelize independent database operations
        const [orderCount, lastOrder, customer, billingAddress, orderPackage] = await Promise.all([
          tx.order.count({
            where: { user_id: userId, created_at: { gte: new Date(new Date().getFullYear(), 0, 1) } }
          }),
          // Fetch last order for sequence timing
          tx.order.findFirst({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            select: { created_at: true }
          }),
          // Upsert customer
          tx.customer.upsert({
            where: { phone: data.deliveryDetails.mobileNumber },
            update: {},
            create: {
              name: data.deliveryDetails.fullName,
              email: data.deliveryDetails.email,
              phone: data.deliveryDetails.mobileNumber,
              addresses: {
                create: {
                  name: data.deliveryDetails.fullName,
                  address: data.deliveryDetails.billingIsSameAsDelivery ? data.deliveryDetails.completeAddress : data.deliveryDetails.billingCompleteAddress || "",
                  city: customerPincode?.city || "",
                  state: customerPincode?.state || "",
                  pincode: customerPincode?.pincode || "",
                }
              }
            }
          }),
          // Create billing address
          tx.address.create({
            data: {
              name: data.sellerDetails.sellerName,
              country: data.sellerDetails.isAddressAvailable ? data.sellerDetails.country : 'India',
              address: data.sellerDetails.address || '',
              city: sellerPincode?.city || '',
              state: sellerPincode?.state || '',
              pincode: sellerPincode?.pincode || '',
            }
          }),
          tx.package.create({
            data: {
              weight: Number(data.packageDetails.deadWeight),
              dead_weight: Number(data.packageDetails.deadWeight),
              volumetric_weight: volumetricWeight,
              length: Number(data.packageDetails.length),
              breadth: Number(data.packageDetails.breadth),
              height: Number(data.packageDetails.height),
            },
          })
        ]);

        const [orderCode] = await Promise.all([
          generateId({
            tableName: 'order',
            entityName: userName,
            lastUsedFinancialYear: getFinancialYear(lastOrder?.created_at || new Date()),
            lastSequenceNumber: orderCount,
          }).id,
        ]);

        // Prepare order items in parallel
        const orderItems = data.productDetails.products.map((item, idx) => ({
          code: orderCode + "-" + generateId({
            tableName: 'order_item',
            entityName: item.name,
            lastUsedFinancialYear: getFinancialYear(lastOrder?.created_at || new Date()),
            lastSequenceNumber: idx,
          }).id,
          name: item.name,
          sku: item.sku,
          units: item.quantity,
          selling_price: item.price,
          tax: item.taxRate,
          hsn: item.hsnCode,
        }));

        // Create the order with pre-computed values
        const order = await tx.order.create({
          data: {
            code: orderCode,
            order_channel_config: {
              create: {
                channel: data.orderChannel?.toUpperCase() as Channel || 'CUSTOM',
                channel_order_id: orderNumber,
              },
            },
            applicable_weight: Math.max(Number(data.packageDetails.deadWeight), volumetricWeight),
            order_number: orderNumber,
            status: 'CREATED',
            total_amount: data.productDetails.taxableValue,
            amount_to_collect: data.amountToCollect,
            payment_mode: data.paymentMethod.paymentMethod?.toUpperCase() as PaymentMethod || 'COD',
            bucket: 0,
            ewaybill: data.ewaybill,
            items: { create: orderItems },
            package: { connect: { id: orderPackage.id } },
            customer: { connect: { id: customer.id } },
            user: { connect: { id: userId } },
            billing_address: { connect: { id: billingAddress.id } },
            hub: { connect: { id: data.pickupAddressId } },
          },
        });

        return order;
      });
    } catch (error: any) {
      // Handle and throw user-friendly error messages
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new Error('A conflict occurred: An order or related record already exists with the same unique identifier.');
          case 'P2025':
            throw new Error('Required record not found: Customer, address, or hub does not exist.');
          default:
            throw new Error(`Database error: ${error.message}`);
        }
      } else if (error instanceof Error) {
        throw new Error(`Failed to create order: ${error.message}`);
      } else {
        throw new Error('An unexpected error occurred while creating the order. Please try again.');
      }
    }
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
