import { getPincodeDetails } from '@/utils/pincode';
import { Prisma, prisma, ShipmentStatus } from '@lorrigo/db';
import { Channel, PaymentMethod } from '@lorrigo/db';
import {
  generateId,
  getFinancialYear,
  OrderFormValues,
  UpdateOrderFormValues,
} from '@lorrigo/utils';
import { FastifyInstance } from 'fastify';

/**
 * Order Service handles business logic related to orders
 */
export class OrderService {
  constructor(
    private fastify: FastifyInstance,
  ) { }

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
          hub: {
            select: {
              name: true,
              phone: true,
              code: true,
              contact_person_name: true,
              address: {
                select: {
                  pincode: true,
                  city: true,
                  state: true,
                  address: true,
                },
              },
            },
          },
          package: {
            select: {
              length: true,
              breadth: true,
              height: true,
              dead_weight: true,
              volumetric_weight: true,
            },
          },
          shipment: {
            select: {
              awb: true,
              pickup_date: true,
              edd: true,
              pickup_id: true,
              courier: {
                select: {
                  name: true,
                  channel_config: { 
                    select: {
                      nickname: true,
                    }
                  }
                },
              },
              tracking_events: {
                take: 1,
                orderBy: {
                  timestamp: 'desc',
                },
                select: {
                  status: true,
                  timestamp: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: {
                select: {
                  pincode: true,
                  city: true,
                  state: true,
                  address: true,
                },
              },
            },
          },
        },
      }),
      this.fastify.prisma.order.count({ where }),
    ]);

    
    // Format orders for response
    const formatted_orders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.shipment?.tracking_events[0]?.status || order.status,
      courier: order.shipment?.courier?.name || '',
      courierNickname: order.shipment?.courier?.channel_config?.nickname || '',
      customer: {
        name: order.customer.name,
        email: order.customer.email || '',
        phone: order.customer.phone || '',
        address: order.customer.address?.address || '',
        city: order.customer.address?.city || '',
        state: order.customer.address?.state || '',
        pincode: order.customer.address?.pincode || '',
      },
      hub: {
        name: order.hub?.name || '',
        lorrigoPickupId: order.hub?.code || '',
        address: order.hub?.address?.address || '',
        city: order.hub?.address?.city || '',
        state: order.hub?.address?.state || '',
        pincode: order.hub?.address?.pincode || '',
      },
      packageDetails: {
        length: order.package.length,
        breadth: order.package.breadth,
        height: order.package.height,
        deadWeight: order.package.dead_weight,
        volumetricWeight: order.package.volumetric_weight,
      },
      awb: order.shipment?.awb || '',
      trackingEvents: order.shipment?.tracking_events || [],
      totalAmount: order.total_amount,
      customer_id: order.customer_id,
      paymentType: order.payment_mode,
      amountToCollect: order.amount_to_collect,
      pickupDate: order.shipment?.pickup_date,
      edd: order.shipment?.edd || '',
      pickupId: order.shipment?.pickup_id || '',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
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
        hub: {
          select: {
            name: true,
            phone: true,
            code: true,
            contact_person_name: true,
            address: {
              select: {
                pincode: true,
                city: true,
                state: true,
                address: true,
              },
            },
          },
        },
        package: {
          select: {
            length: true,
            breadth: true,
            height: true,
            dead_weight: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: {
              select: {
                pincode: true,
                city: true,
                state: true,
                address: true,
              },
            },
          },
        },
        billing_address: true,
        shipment: {
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
      // Create order transaction with schema-aligned optimizations
      return await this.fastify.prisma.$transaction(
        async (tx) => {
          const orderNumber = data.orderId;

          // OPTIMIZATION 1: Batch all validation and lookup queries
          const [existingOrder, orderCount, lastOrder, existingCustomer] = await Promise.all([
            // Check order number uniqueness for this user
            tx.order.findUnique({
              where: {
                order_number_user_id: {
                  order_number: orderNumber,
                  user_id: userId,
                },
              },
              select: { id: true },
            }),

            // Get order count for current year
            tx.order.count({
              where: {
                user_id: userId,
                created_at: { gte: new Date(new Date().getFullYear(), 0, 1) },
              },
            }),

            // Get last order timestamp
            tx.order.findFirst({
              where: { user_id: userId },
              orderBy: { created_at: 'desc' },
              select: { created_at: true },
            }),

            // Check existing customer
            tx.customer.findUnique({
              where: { phone: data.deliveryDetails.mobileNumber },
              select: { id: true },
            }),
          ]);

          if (existingOrder) {
            throw new Error('Order Id already exists. Please try with another Order Id.');
          }

          // OPTIMIZATION 2: Pre-calculate all values
          const volumetricWeight = Math.floor(
            (Number(data.packageDetails.length) *
              Number(data.packageDetails.breadth) *
              Number(data.packageDetails.height)) /
            5000
          );

          const deadWeight = Number(data.packageDetails.deadWeight);
          const applicableWeight = Math.max(deadWeight, volumetricWeight);
          const financialYear = getFinancialYear(lastOrder?.created_at || new Date());

          // Generate order code
          const orderCode = generateId({
            tableName: 'order',
            entityName: userName,
            lastUsedFinancialYear: financialYear,
            lastSequenceNumber: orderCount,
          }).id;

          // OPTIMIZATION 3: Batch external API calls and independent DB operations
          const [sellerPincode, customerPincode, package_record, billing_address] =
            await Promise.all([
              // External API calls (biggest bottleneck)
              getPincodeDetails(Number(data.sellerDetails.pincode || '000000')),
              getPincodeDetails(
                Number(
                  data.deliveryDetails.billingIsSameAsDelivery
                    ? data.deliveryDetails.billingPincode
                    : data.deliveryDetails.pincode
                )
              ),

              // Create package
              tx.package.create({
                data: {
                  weight: deadWeight,
                  dead_weight: deadWeight,
                  volumetric_weight: volumetricWeight,
                  length: Number(data.packageDetails.length),
                  breadth: Number(data.packageDetails.breadth),
                  height: Number(data.packageDetails.height),
                },
                select: { id: true },
              }),

              // Create billing address (seller address)
              tx.address.create({
                data: {
                  name: data.sellerDetails.sellerName,
                  country: data.sellerDetails.isAddressAvailable
                    ? data.sellerDetails.country
                    : 'India',
                  address: data.sellerDetails.address || '',
                  city: '', // Will update after pincode lookup
                  state: '', // Will update after pincode lookup
                  pincode: '', // Will update after pincode lookup
                },
                select: { id: true },
              }),
            ]);

          // OPTIMIZATION 4: Handle customer creation/retrieval and address updates in parallel
          const [customer, updated_billing_address] = await Promise.all([
            // Handle customer
            existingCustomer ||
            tx.customer.create({
              data: {
                name: data.deliveryDetails.fullName,
                email: data.deliveryDetails.email,
                phone: data.deliveryDetails.mobileNumber,
              },
              select: { id: true },
            }),

            // Update billing address with pincode data
            tx.address.update({
              where: { id: billing_address.id },
              data: {
                city: sellerPincode?.city || '',
                state: sellerPincode?.state || '',
                pincode: sellerPincode?.pincode || '',
              },
              select: { id: true },
            }),
          ]);

          // OPTIMIZATION 5: Create order channel config first (required for order)
          const orderChannelConfig = await tx.orderChannelConfig.create({
            data: {
              channel: (data.orderChannel?.toUpperCase() as Channel) || 'CUSTOM',
              channel_order_id: orderNumber,
            },
            select: { id: true },
          });

          // OPTIMIZATION 6: Create order with all required foreign keys
          const order = await tx.order.create({
            data: {
              code: orderCode,
              order_number: orderNumber,
              type: 'B2C', // Default from schema
              status: 'NEW',
              shipment: {
                create: {
                  code: orderCode,
                  user_id: userId,
                  tracking_events: {
                    create: [
                      {
                        description: 'Order Created',
                        status: 'NEW',
                        timestamp: new Date(),
                        code: 'NEW',
                      },
                    ],
                  },
                },
              },
              payment_mode:
                (data.paymentMethod.paymentMethod?.toUpperCase() as PaymentMethod) || 'COD',
              order_channel_config_id: orderChannelConfig.id,
              total_amount: data.productDetails.taxableValue,
              amount_to_collect: data.amountToCollect,
              applicable_weight: applicableWeight,
              ewaybill: data.ewaybill,
              user_id: userId,
              customer_id: customer.id,
              package_id: package_record.id,
              billing_address_id: updated_billing_address.id,
              hub_id: data.pickupAddressId,
            },
            select: {
              id: true,
              code: true,
              order_number: true,
              status: true,
              created_at: true,
            },
          });

          // OPTIMIZATION 7: Create order items in batch (final step)
          const orderItems = data.productDetails.products.map((item, idx) => ({
            code: `${orderCode}-${generateId({
              tableName: 'order_item',
              entityName: item.name,
              lastUsedFinancialYear: financialYear,
              lastSequenceNumber: idx,
            }).id
              }`,
            name: item.name,
            sku: item.sku,
            units: item.quantity,
            selling_price: item.price,
            tax: item.taxRate,
            hsn: item.hsnCode,
            order_id: order.id,
          }));

          await tx.orderItem.createMany({
            data: orderItems,
            skipDuplicates: true,
          });

          // OPTIMIZATION 8: Create customer delivery address only if customer was just created
          if (!existingCustomer) {
            await tx.address.create({
              data: {
                name: data.deliveryDetails.fullName,
                address: data.deliveryDetails.billingIsSameAsDelivery
                  ? data.deliveryDetails.completeAddress
                  : data.deliveryDetails.billingCompleteAddress || '',
                city: customerPincode?.city || '',
                state: customerPincode?.state || '',
                pincode: customerPincode?.pincode || '',
                customer_id: customer.id,
              },
            });
          }

          return order;
        },
        {
          // OPTIMIZATION 9: Configure transaction settings for better performance
          maxWait: 5000, // 5 seconds max wait
          timeout: 10000, // 10 seconds timeout
          isolationLevel: 'ReadCommitted', // Less strict isolation for better performance
        }
      );
    } catch (error: any) {
      // Enhanced error handling
      if (error.message === 'Order number already exists. Please try another order number.') {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const errorMap = {
          P2002: 'A conflict occurred: An order or related record already exists.',
          P2025: 'Required record not found: Customer, address, or hub does not exist.',
          P2003: 'Foreign key constraint failed: Invalid reference to related record.',
          P2034: 'Transaction failed due to a write conflict or deadlock. Please retry.',
        };
        throw new Error(
          errorMap[error.code as keyof typeof errorMap] || `Database error: ${error.message}`
        );
      }

      throw new Error(
        error instanceof Error
          ? `Failed to create order: ${error.message}`
          : 'An unexpected error occurred while creating the order. Please try again.'
      );
    }
  }

  // OPTIMIZATION 10: Add method with caching for frequently called operations
  async createOrderOptimized(data: OrderFormValues, userId: string, userName: string) {
    // Pre-validation to fail fast
    if (!data.orderId || !userId || !data.pickupAddressId) {
      throw new Error('Missing required fields: orderId, userId, or pickupAddressId');
    }

    // Cache key for pincode lookups
    const pincodeKey = `${data.sellerDetails.pincode}-${data.deliveryDetails.pincode}`;

    // You can add Redis caching here:
    // const cachedPincodes = await this.redis.mget([
    //   `pincode:${data.sellerDetails.pincode}`,
    //   `pincode:${data.deliveryDetails.pincode}`
    // ]);

    return this.createOrder(data, userId, userName);
  }
  /**
   * Update an order status
   */
  async updateOrderStatus(id: string, update_data: UpdateOrderFormValues) {
    return this.fastify.prisma.order.update({
      where: { id },
      data: {
        status: update_data.status as ShipmentStatus,
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
        shipment: true,
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
    const hasShipmentsInProgress =
      existingOrder.shipment && !['CREATED', 'CANCELLED'].includes(existingOrder.shipment.status);

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
        status: 'NEW',
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
