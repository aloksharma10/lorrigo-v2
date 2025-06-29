import { calculateVolumetricWeight } from '@/utils/calculate-order-price';
import { getPincodeDetails } from '@/utils/pincode';
import { Prisma, ShipmentStatus } from '@lorrigo/db';
import { Channel, PaymentMethod } from '@lorrigo/db';
import {
  generateId,
  getFinancialYear,
  OrderFormValues,
  parseSortField,
  UpdateOrderFormValues,
  ShipmentBucket,
  getStatusBuckets,
  ShipmentBucketManager,
} from '@lorrigo/utils';
import { FastifyInstance } from 'fastify';
import { addJob, QueueNames } from '@/lib/queue';
import { BulkOrderJobType } from '../queues/bulk-order-worker';



/**
 * Order Service handles business logic related to orders
 */
export class OrderService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(userId: string, queryParams: any) {
    const {
      page = 1,
      limit = 10,
      status,
      search = '',
      from_date,
      to_date,
      sort = 'created_at',
      sort_order = 'desc',
    } = queryParams;

    const skip = (page - 1) * limit;

    // Build the where clause
    let where: any = {
      user_id: userId,
    };

    // Add status filter using bucket mapping
    if (status && status !== 'all') {
      const buckets = getStatusBuckets(status);
      if (buckets.length > 0) {
        // Merge with existing shipment filter if it exists
        if (where.shipment?.is) {
          where.shipment.is.bucket = { in: buckets };
        } else {
          where.shipment = {
            is: {
              bucket: {
                in: buckets
              }
            }
          };
        }
      }
    }

    console.log(where, "where")

    // Date filters
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) {
        const startOfDay = new Date(from_date);
        startOfDay.setHours(0, 0, 0, 0);
        where.created_at.gte = startOfDay;
      }
      if (to_date) {
        const endOfDay = new Date(to_date);
        endOfDay.setHours(23, 59, 59, 999);
        where.created_at.lte = endOfDay;
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        {
          shipment: {
            is: {
              OR: [
                { pickup_id: { contains: search, mode: 'insensitive' } },
                { awb: { contains: search, mode: 'insensitive' } },
              ]
            },
          },
        },
        { order_invoice_number: { contains: search, mode: 'insensitive' } },
        { order_reference_id: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            is: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          seller_details: {
            is: {
              OR: [
                { seller_name: { contains: search, mode: 'insensitive' } },
                { gst_no: { contains: search, mode: 'insensitive' } },
                { contact_number: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const orderBy = parseSortField({ field: sort, direction: sort_order });

    // Now call Prisma
    const [orders, total] = await Promise.all([
      this.fastify.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          order_channel_config: {
            select: {
              channel: true,
            },
          },
          hub: {
            select: {
              id: true,
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
          items: true,
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
              bucket: true,
              status: true,
              courier: {
                select: {
                  name: true,
                  channel_config: {
                    select: {
                      nickname: true,
                    },
                  },
                },
              },
              tracking_events: {
                take: 1,
                orderBy: {
                  timestamp: 'desc',
                },
                select: {
                  status: true,
                  status_code: true,
                  description: true,
                  location: true,
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
          seller_details: {
            include: {
              address: true,
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
      status: order.shipment?.bucket !== null && order.shipment?.bucket !== undefined
        ? ShipmentBucketManager.getBucketStatus(order.shipment.bucket)
        : order.shipment?.tracking_events?.[0]?.status || order.status,
      bucket: order.shipment?.bucket ?? ShipmentBucket.AWAITING,
      courier: order.shipment?.courier?.name || '',
      courierNickname: order.shipment?.courier?.channel_config?.nickname || '',
      channel: order.order_channel_config?.channel || '',
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
        id: order.hub?.id || '',
        name: order.hub?.name || '',
        lorrigoPickupId: order.hub?.code || '',
        address: order.hub?.address?.address || '',
        city: order.hub?.address?.city || '',
        state: order.hub?.address?.state || '',
        pincode: order.hub?.address?.pincode || '',
      },
      sellerDetails: {
        id: order.seller_details?.id || '',
        name: order.seller_details?.seller_name || '',
        gstNo: order.seller_details?.gst_no || '',
        contactNumber: order.seller_details?.contact_number || '',
        address: order.seller_details?.address?.address || '',
        city: order.seller_details?.address?.city || '',
        state: order.seller_details?.address?.state || '',
        pincode: order.seller_details?.address?.pincode || '',
      },
      productDetails: {
        products: order.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.units,
          price: item.selling_price,
          taxRate: item.tax,
          hsnCode: item.hsn,
        })),
        taxableValue: order.total_amount,
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
      orderInvoiceNumber: order.order_invoice_number,
      orderInvoiceDate: order.order_invoice_date,
      ewaybill: order.ewaybill,
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
            hub_config: {
              select: {
                smart_ship_hub_code_express: true,
                smart_ship_hub_code_surface: true,
                smart_ship_hub_code_heavy: true,
                is_cod_enabled: true,
                is_prepaid_enabled: true,
              },
            },
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
        seller_details: {
          include: {
            address: true,
          },
        },
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
          const [existingOrder, orderCount, lastOrder, existingCustomer, shipmentCount] =
            await Promise.all([
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

              // Get shipment count for current year
              tx.shipment.count({
                where: {
                  user_id: userId,
                  created_at: { gte: new Date(new Date().getFullYear(), 0, 1) },
                },
              }),
            ]);

          if (existingOrder) {
            throw new Error('Order Id already exists. Please try with another Order Id.');
          }

          // OPTIMIZATION 2: Pre-calculate all values
          const volumetricWeight = calculateVolumetricWeight(
            Number(data?.packageDetails?.length),
            Number(data?.packageDetails?.breadth),
            Number(data?.packageDetails?.height),
            'cm'
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

          const shipmentCode = generateId({
            tableName: 'shipment',
            entityName: userName,
            lastUsedFinancialYear: financialYear,
            lastSequenceNumber: shipmentCount,
          }).id;

          // OPTIMIZATION 3: Batch external API calls and independent DB operations
          const [sellerPincode, customerPincode, package_record, seller_details] =
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

              // Create seller address
              tx.orderSellerDetails.create({
                data: {
                  seller_name: data.sellerDetails.name,
                  gst_no: data.sellerDetails.gstNo,
                  contact_number: data.sellerDetails.contactNumber,
                  address: {
                    create: {
                      name: data.sellerDetails.name,
                      address: data.sellerDetails.address || '',
                      city: '',
                      state: '',
                      pincode: '',
                    },
                  },
                },
              }),
            ]);

          // OPTIMIZATION 4: Handle customer creation/retrieval and address updates in parallel
          const [customer, updated_seller_details] = await Promise.all([
            // Handle customer
            existingCustomer ||
              tx.customer.create({
                data: {
                  name: data.deliveryDetails.fullName,
                  email: data.deliveryDetails.email,
                  phone: data.deliveryDetails.mobileNumber,
                  // address: {
                  //   create: {
                  //     name: data.deliveryDetails.fullName,
                  //     address: data.deliveryDetails.completeAddress,
                  //     city: data.deliveryDetails.city,
                  //     state: data.deliveryDetails.state,
                  //     pincode: data.deliveryDetails.pincode,
                  //   },
                  // },
                },
                select: { id: true },
              }),

            // Update billing address with pincode data
            tx.address.update({
              where: { id: seller_details.address_id || '' },
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
                  code: shipmentCode,
                  user_id: userId,
                  tracking_events: {
                    create: [
                      {
                        description: 'Order Created',
                        status: 'NEW',
                        timestamp: new Date(),
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
              seller_details_id: seller_details.id,
              hub_id: data.pickupAddressId,
              order_invoice_number: data.order_invoice_number,
              order_invoice_date: data.order_invoice_date,
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
            code: `${orderCode}-${
              generateId({
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

  async updateOrder(orderId: string, data: OrderFormValues, userId: string, userName: string) {
    try {
      return await this.fastify.prisma.$transaction(
        async (tx) => {
          // Step 1: Verify order exists and belongs to the user
          const existingOrder = await tx.order.findUnique({
            where: {
              order_number_user_id: {
                order_number: orderId,
                user_id: userId,
              },
            },
            include: {
              package: true,
              customer: true,
              seller_details: {
                include: {
                  address: true,
                },
              },
              order_channel_config: true,
              shipment: true,
              items: true,
            },
          });

          if (!existingOrder) {
            throw new Error('Order not found or does not belong to this user.');
          }

          // Step 2: Pre-calculate values (e.g., volumetric weight)
          const volumetricWeight = calculateVolumetricWeight(
            Number(data?.packageDetails?.length),
            Number(data?.packageDetails?.breadth),
            Number(data?.packageDetails?.height),
            'cm'
          );
          const deadWeight = Number(data.packageDetails.deadWeight);
          const applicableWeight = Math.max(deadWeight, volumetricWeight);

          // Step 3: Batch external API calls and lookups
          const [sellerPincode, customerPincode] = await Promise.all([
            getPincodeDetails(Number(data.sellerDetails.pincode || '000000')),
            getPincodeDetails(
              Number(
                data.deliveryDetails.billingIsSameAsDelivery
                  ? data.deliveryDetails.pincode
                  : data.deliveryDetails.billingPincode
              )
            ),
          ]);

          // Step 4: Update customer information
          const customerUpdates = await tx.customer.update({
            where: { id: existingOrder.customer_id },
            data: {
              name: data.deliveryDetails.fullName,
              email: data.deliveryDetails.email || undefined,
              phone: data.deliveryDetails.mobileNumber,
            },
          });

          // Step 5: Handle customer address
          // First check if customer already has an address
          const existingCustomerAddress = await tx.address.findFirst({
            where: { customer_id: existingOrder.customer_id },
          });

          if (existingCustomerAddress) {
            // Update existing customer address
            await tx.address.update({
              where: { id: existingCustomerAddress.id },
              data: {
                name: data.deliveryDetails.fullName,
                address: data.deliveryDetails.completeAddress,
                address_2: data.deliveryDetails.landmark || undefined,
                city: customerPincode?.city || data.deliveryDetails.city,
                state: customerPincode?.state || data.deliveryDetails.state,
                pincode: customerPincode?.pincode || data.deliveryDetails.pincode,
                phone: data.deliveryDetails.mobileNumber,
              },
            });
          } else {
            // Create new customer address if it doesn't exist
            await tx.address.create({
              data: {
                name: data.deliveryDetails.fullName,
                address: data.deliveryDetails.completeAddress,
                address_2: data.deliveryDetails.landmark || undefined,
                city: customerPincode?.city || data.deliveryDetails.city,
                state: customerPincode?.state || data.deliveryDetails.state,
                pincode: customerPincode?.pincode || data.deliveryDetails.pincode,
                phone: data.deliveryDetails.mobileNumber,
                customer_id: existingOrder.customer_id,
              },
            });
          }

          // Step 6: Update billing address (seller address)
          if (existingOrder.seller_details_id) {
            const sellerDetails = await tx.orderSellerDetails.update({
              where: { id: existingOrder.seller_details_id },
              data: {
                seller_name: data.sellerDetails.name,
                gst_no: data.sellerDetails.gstNo,
                contact_number: data.sellerDetails.contactNumber,
              },
            });

            await tx.address.upsert({
              where: { id: sellerDetails.address_id || '' },
              create: {
                name: data.sellerDetails.name,
                address: data.sellerDetails.address || '',
                city: sellerPincode?.city || data.sellerDetails.city || '',
                state: sellerPincode?.state || data.sellerDetails.state || '',
                pincode: sellerPincode?.pincode || data.sellerDetails.pincode || '',
                country: data.sellerDetails.country || 'India',
                phone: data.sellerDetails.contactNumber || undefined,
              },
              update: {
                name: data.sellerDetails.name,
                address: data.sellerDetails.address || '',
                city: sellerPincode?.city || data.sellerDetails.city || '',
                state: sellerPincode?.state || data.sellerDetails.state || '',
                pincode: sellerPincode?.pincode || data.sellerDetails.pincode || '',
                country: data.sellerDetails.country || 'India',
                phone: data.sellerDetails.contactNumber || undefined,
              },
            });
          } else {
            // Create billing address if it doesn't exist
            const sellerDetails = await tx.orderSellerDetails.create({
              data: {
                seller_name: data.sellerDetails.name,
                gst_no: data.sellerDetails.gstNo,
                contact_number: data.sellerDetails.contactNumber,
              },
            });

            // Update order with new seller details
            await tx.order.update({
              where: { id: existingOrder.id },
              data: {
                seller_details_id: sellerDetails.id,
              },
            });
          }

          // Step 7: Update package details
          await tx.package.update({
            where: { id: existingOrder.package_id },
            data: {
              weight: applicableWeight,
              dead_weight: deadWeight,
              volumetric_weight: volumetricWeight,
              length: Number(data.packageDetails.length),
              breadth: Number(data.packageDetails.breadth),
              height: Number(data.packageDetails.height),
            },
          });

          // Step 8: Update order channel config
          await tx.orderChannelConfig.update({
            where: { id: existingOrder.order_channel_config_id },
            data: {
              channel: (data.orderChannel?.toUpperCase() as Channel) || 'CUSTOM',
              channel_order_id: data.orderId || undefined,
            },
          });

          // Step 9: Update order with all fields
          const orderUpdates = await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              payment_mode:
                (data.paymentMethod.paymentMethod?.toUpperCase() as PaymentMethod) || 'COD',
              total_amount: data.productDetails.taxableValue,
              amount_to_collect: data.amountToCollect,
              applicable_weight: applicableWeight,
              ewaybill: data.ewaybill,
              hub_id: data.pickupAddressId,
              type: data.orderType === 'domestic' ? 'B2C' : 'B2B',
              order_invoice_number: data.order_invoice_number,
              order_invoice_date: data.order_invoice_date
                ? new Date(data.order_invoice_date)
                : undefined,
              order_reference_id: data.orderId,
            },
            select: {
              id: true,
              code: true,
              order_number: true,
              status: true,
              created_at: true,
            },
          });

          // Step 10: Update order items - Delete existing and create new
          await tx.orderItem.deleteMany({
            where: { order_id: existingOrder.id },
          });

          const financialYear = getFinancialYear(existingOrder.created_at);
          const orderItems = data.productDetails.products.map((item, idx) => ({
            code: `${existingOrder.code}-${
              generateId({
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
            discount: 0, // Default value
            tax: item.taxRate,
            hsn: item.hsnCode,
            order_id: existingOrder.id,
          }));

          await tx.orderItem.createMany({
            data: orderItems,
            skipDuplicates: true,
          });

          // Step 11: Update shipment if it exists
          if (existingOrder.shipment) {
            // await tx.shipment.update({
            //   where: { id: existingOrder.shipment.id },
            //   data: {
            //     // Update any shipment fields if needed
            //     cod_amount:
            //       data.paymentMethod.paymentMethod?.toUpperCase() === 'COD'
            //         ? data.amountToCollect
            //         : 0,
            //   },
            // });

            // Add a tracking event for the update
            await tx.trackingEvent.create({
              data: {
                status: existingOrder.shipment.status,
                description: 'Order Updated',
                shipment_id: existingOrder.shipment.id,
                timestamp: new Date(),
              },
            });
          }

          return orderUpdates;
        },
        {
          maxWait: 5000,
          timeout: 10000,
          isolationLevel: 'ReadCommitted',
        }
      );
    } catch (error: any) {
      if (error.message === 'Order not found or does not belong to this user.') {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const errorMap = {
          P2002: 'A conflict occurred: A record already exists.',
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
          ? `Failed to update order: ${error.message}`
          : 'An unexpected error occurred while updating the order. Please try again.'
      );
    }
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

  /**
   * Bulk upload orders
   */
  async bulkUploadOrders(csvContent: string, headerMapping: Record<string, string>, userId: string, userName: string) {
    try {
      // Generate operation ID
      const operationId = generateId({
        tableName: 'bulk_operation',
        entityName: 'bulk_order_upload',
        lastUsedFinancialYear: getFinancialYear(new Date()),
        lastSequenceNumber: 0,
      }).id;

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          id: operationId,
          code: operationId,
          type: 'BULK_ORDER_UPLOAD',
          status: 'PENDING',
          user_id: userId,
          total_count: 0, // Will be updated after CSV parsing
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          created_at: new Date(),
        },
      });

      // Add job to queue for processing
      await addJob(
        QueueNames.BULK_ORDER_UPLOAD,
        BulkOrderJobType.PROCESS_BULK_ORDERS,
        {
          operationId: bulkOperation.id,
          userId,
          userName,
          csvContent,
          headerMapping,
        },
        {
          priority: 1, // High priority for bulk uploads
          attempts: 3,
        }
      );

      return {
        operationId: bulkOperation.id,
        status: 'PENDING',
        totalOrders: 0, // Will be determined during processing
      };
    } catch (error) {
      this.fastify.log.error('Error initiating bulk upload:', error);
      throw new Error(
        error instanceof Error
          ? `Failed to initiate bulk upload: ${error.message}`
          : 'Failed to initiate bulk upload'
      );
    }
  }

  /**
   * Get bulk upload operation status
   */
  async getBulkUploadStatus(operationId: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id: operationId,
          user_id: userId,
          type: 'BULK_ORDER_UPLOAD',
        },
      });

      if (!operation) {
        return null;
      }

      // Calculate progress percentage
      const progress = operation.total_count > 0 
        ? Math.floor((operation.processed_count / operation.total_count) * 100)
        : 0;

      return {
        id: operation.id,
        status: operation.status,
        totalCount: operation.total_count,
        processedCount: operation.processed_count,
        successCount: operation.success_count,
        failedCount: operation.failed_count,
        progress,
        createdAt: operation.created_at,
        reportPath: operation.report_path,
        errorMessage: operation.error_message,
      };
    } catch (error) {
      this.fastify.log.error('Error getting bulk upload status:', error);
      throw new Error(
        error instanceof Error
          ? `Failed to get bulk upload status: ${error.message}`
          : 'Failed to get bulk upload status'
      );
    }
  }

  /**
   * Download bulk upload report
   */
  async downloadBulkUploadReport(operationId: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id: operationId,
          user_id: userId,
          type: 'BULK_ORDER_UPLOAD',
        },
      });

      if (!operation) {
        throw new Error('Bulk upload operation not found');
      }

      if (!operation.report_path) {
        throw new Error('Report not available for this operation');
      }

      return {
        filePath: operation.report_path,
        fileName: `bulk_order_report_${operationId}.csv`,
      };
    } catch (error) {
      this.fastify.log.error('Error downloading bulk upload report:', error);
      throw new Error(
        error instanceof Error
          ? `Failed to download report: ${error.message}`
          : 'Failed to download report'
      );
    }
  }
}
