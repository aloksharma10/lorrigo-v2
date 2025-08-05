import { calculateVolumetricWeight } from '@/utils/calculate-order-price';
import { getPincodeDetails, PincodeDetails } from '@/utils/pincode';
import { AddressType, Prisma, ShipmentStatus } from '@lorrigo/db';
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
import { appCache } from '@/lib/cache';

/**
 * Order Service handles business logic related to orders
 */
export class OrderService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(userId: string, queryParams: any, is_reverse_order: boolean = false) {
    const { page = 1, limit = 10, status, search = '', from_date, to_date, sort = 'created_at', sort_order = 'desc', payment_method } = queryParams;

    const skip = (page - 1) * limit;

    // Build the where clause
    let where: any = {
      user_id: userId,
      is_reverse_order,
    };
    // Add status filter using bucket mapping
    if (status && status !== 'all' && typeof status === 'string') {
      // Check if status contains numeric values (e.g., "0,1,2")
      const isNumericStatus = status.split(',').every((s: string) => !Number.isNaN(Number(s.trim())));

      if (isNumericStatus) {
        // Handle numeric status values
        where.shipment = {
          is: {
            bucket: { in: status.split(',').map((bucket: string) => Number(bucket.trim())) },
          },
        };
      } else {
        // Handle string status values (e.g., "NEW,COURIER_ASSIGNED")
        const buckets = getStatusBuckets(status);
        if (buckets.length > 0) {
          // Merge with existing shipment filter if it exists
          if (where.shipment?.is) {
            where.shipment.is.bucket = { in: buckets };
          } else {
            where.shipment = {
              is: {
                bucket: {
                  in: buckets,
                },
              },
            };
          }
        }
      }
    }

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

    // payment mode filter
    if (payment_method) {
      where.payment_method = { in: payment_method.toUpperCase().split(',') };
    }

    // Search filter
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        {
          shipment: {
            is: {
              OR: [{ pickup_id: { contains: search, mode: 'insensitive' } }, { awb: { contains: search, mode: 'insensitive' } }],
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
      is_reverse_order: order.is_reverse_order,
      orderNumber: order.order_number,
      status:
        order.shipment?.bucket !== null && order.shipment?.bucket !== undefined
          ? ShipmentBucketManager.getBucketStatus(order.shipment.bucket)
          : order.shipment?.tracking_events?.[0]?.status || 'NEW',
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
      paymentType: order.payment_method,
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
            smart_ship_codes: true,
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
      },
    });
  }

  async createOrder(data: OrderFormValues, userId: string, userName: string) {
    const MAX_RETRIES = 2;
    let attempt = 0;

    // Pre-calculate values outside transaction to reduce lock time
    const orderNumber = data.orderId;
    const financialYear = getFinancialYear(new Date());
    const volumetricWeight = calculateVolumetricWeight(
      Number(data.packageDetails.length || 0),
      Number(data.packageDetails.breadth || 0),
      Number(data.packageDetails.height || 0),
      'cm'
    );
    const deadWeight = Number(data.packageDetails.deadWeight || 0);
    const applicableWeight = Math.max(deadWeight, volumetricWeight);

    // Cache for pincode results to avoid redundant external API calls
    const pincodeCache = new Map<string, any>();

    while (attempt < MAX_RETRIES) {
      try {
        return await this.fastify.prisma.$transaction(
          async (tx) => {
            // OPTIMIZATION 1: Batch validation queries
            const [existingOrder, orderCount, shipmentCount, existingCustomer, hub] = await Promise.all([
              // Check order number uniqueness
              tx.order.findUnique({
                where: { order_number_user_id: { order_number: orderNumber, user_id: userId } },
                select: { id: true },
              }),
              // Get order count for sequence
              tx.order.count({
                where: {
                  user_id: userId,
                  created_at: { gte: new Date(new Date().getFullYear(), 0, 1) },
                },
              }),
              // Get shipment count for sequence
              tx.shipment.count({
                where: {
                  user_id: userId,
                  created_at: { gte: new Date(new Date().getFullYear(), 0, 1) },
                },
              }),
              // Check existing customer with single address
              tx.customer.findUnique({
                where: { phone: data.deliveryDetails.mobileNumber },
                select: {
                  id: true,
                  address: {
                    select: {
                      id: true,
                      address: true,
                      address_2: true,
                      city: true,
                      state: true,
                      pincode: true,
                    },
                  },
                },
              }),
              // Get hub for seller
              tx.hub.findFirst({
                where: { id: data.pickupAddressId, user_id: userId, is_active: true },
                include: { address: true },
              }),
            ]);

            if (existingOrder) {
              throw new Error('Order Id already exists. Please try with another Order Id.');
            }

            if (!hub) {
              throw new Error('No active hub found for seller');
            }

            // OPTIMIZATION 2: Generate IDs early
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

            // OPTIMIZATION 3: Parallelize external API calls and DB operations
            const [sellerPincode, customerPincode, packageRecord, sellerDetails, orderChannelConfig] = await Promise.all([
              // Fetch or use cached seller pincode
              (async () => {
                const pin = data.sellerDetails?.pincode || hub.address.pincode || '000000';
                if (pincodeCache.has(pin)) return pincodeCache.get(pin)!;
                const result = await getPincodeDetails(pin);
                pincodeCache.set(pin, result);
                return result;
              })(),
              // Fetch or use cached customer pincode
              (async () => {
                const pin = data.deliveryDetails.pincode;
                if (!pin) throw new Error('Customer pincode is required');
                if (pincodeCache.has(pin)) return pincodeCache.get(pin)!;
                const result = await getPincodeDetails(pin);
                pincodeCache.set(pin, result);
                return result;
              })(),
              // Create package
              tx.package.create({
                data: {
                  weight: deadWeight,
                  dead_weight: deadWeight,
                  volumetric_weight: volumetricWeight,
                  length: Number(data.packageDetails.length || 0),
                  breadth: Number(data.packageDetails.breadth || 0),
                  height: Number(data.packageDetails.height || 0),
                },
                select: { id: true },
              }),
              // Create seller details
              tx.orderSellerDetails.create({
                data: {
                  seller_name: data.sellerDetails?.name || userName,
                  gst_no: data.sellerDetails?.gstNo,
                  contact_number: data.sellerDetails?.contactNumber,
                  address: {
                    create: {
                      type: AddressType.CUSTOMER,
                      name: data.sellerDetails?.name || userName,
                      address: data.sellerDetails?.address || hub.address.address,
                      address_2: data.sellerDetails?.address || hub.address.address_2,
                      city: hub.address.city,
                      state: hub.address.state,
                      pincode: hub.address.pincode,
                      phone: data.sellerDetails?.contactNumber || hub.phone,
                      country: 'India',
                    },
                  },
                },
                select: { id: true, address_id: true },
              }),
              // Create order channel config
              tx.orderChannelConfig.create({
                data: {
                  channel: (data.orderChannel?.toUpperCase() as Channel) || 'CUSTOM',
                  // channel_order_id: data.channel?.orderId || orderNumber, // TODO: Add channel order id ( Only for Shopify )
                },
                select: { id: true },
              }),
            ]);

            // Update seller address with pincode data
            await tx.address.update({
              where: { id: sellerDetails.address_id || '' },
              data: {
                city: sellerPincode?.city || hub.address.city,
                state: sellerPincode?.state || hub.address.state,
                pincode: sellerPincode?.pincode || hub.address.pincode,
              },
            });

            // OPTIMIZATION 4: Simplified customer and address handling
            const newAddressData = {
              type: AddressType.CUSTOMER,
              name: data.deliveryDetails.fullName,
              address: data.deliveryDetails.completeAddress,
              address_2: data.deliveryDetails.landmark || '',
              city: customerPincode?.city || data.deliveryDetails.city,
              state: customerPincode?.state || data.deliveryDetails.state,
              pincode: customerPincode?.pincode || data.deliveryDetails.pincode,
              phone: data.deliveryDetails.mobileNumber,
              country: 'India',
            };

            const customer = await (async () => {
              if (existingCustomer) {
                // Update customer details
                const updatedCustomer = await tx.customer.update({
                  where: { id: existingCustomer.id },
                  data: {
                    name: data.deliveryDetails.fullName,
                    email: data.deliveryDetails.email || null,
                  },
                  select: { id: true },
                });

                // Update existing address if it exists and differs
                if (existingCustomer.address) {
                  const existingAddress = existingCustomer.address;
                  if (
                    existingAddress.address !== newAddressData.address ||
                    existingAddress.address_2 !== newAddressData.address_2 ||
                    existingAddress.city !== newAddressData.city ||
                    existingAddress.state !== newAddressData.state ||
                    existingAddress.pincode !== newAddressData.pincode
                  ) {
                    await tx.address.update({
                      where: { id: existingAddress.id },
                      data: newAddressData,
                    });
                  }
                } else {
                  // Create address if none exists
                  await tx.address.create({
                    data: { ...newAddressData, customer_id: existingCustomer.id },
                  });
                }

                return updatedCustomer;
              } else {
                // Create new customer with address
                return await tx.customer.create({
                  data: {
                    name: data.deliveryDetails.fullName,
                    email: data.deliveryDetails.email || null,
                    phone: data.deliveryDetails.mobileNumber,
                    address: { create: newAddressData },
                  },
                  select: { id: true },
                });
              }
            })();

            // Calculate COD amount
            const codAmount = data.paymentMethod.paymentMethod === 'cod' ? data.amountToCollect : 0;

            // OPTIMIZATION 5: Create order
            const order = await tx.order.create({
              data: {
                is_reverse_order: data.is_reverse_order,
                code: orderCode,
                order_number: orderNumber,
                type: data.orderType === 'domestic' ? 'B2C' : 'B2B',
                payment_method: data.is_reverse_order ? 'PREPAID' : (data.paymentMethod.paymentMethod?.toUpperCase() as PaymentMethod) || 'COD',
                order_channel_config_id: orderChannelConfig.id,
                total_amount: data.productDetails.taxableValue,
                amount_to_collect: codAmount,
                applicable_weight: applicableWeight,
                order_reference_id: data.orderId,
                ewaybill: data.ewaybill,
                order_invoice_date: data.order_invoice_date ? new Date(data.order_invoice_date) : undefined,
                order_invoice_number: data.order_invoice_number,
                // freight_type: data.orderDetails.freight || 0,
                // pickup_type: data.orderDetails.pickup || 0,
                // insurance_type: data.orderDetails.insurance || 0,
                user_id: userId,
                customer_id: customer.id,
                hub_id: hub.id,
                seller_details_id: sellerDetails.id,
                package_id: packageRecord.id,
                shipment: {
                  create: {
                    code: shipmentCode,
                    user_id: userId,
                    status: ShipmentStatus.NEW,
                    bucket: ShipmentBucketManager.getBucketFromStatus(ShipmentStatus.NEW),
                    tracking_events: {
                      create: [{ description: 'Order Created', status: 'NEW', timestamp: new Date() }],
                    },
                  },
                },
              },
              include: {
                customer: true,
                hub: { include: { address: true } },
                package: true,
                seller_details: { include: { address: true } },
              },
            });

            // OPTIMIZATION 6: Create order items in batch
            const orderItems =
              data.productDetails.products?.map((item, idx) => ({
                code: `${orderCode}-${
                  generateId({
                    tableName: 'orderItem',
                    entityName: item.name || 'Item',
                    lastUsedFinancialYear: financialYear,
                    lastSequenceNumber: idx,
                  }).id
                }`,
                name: item.name,
                sku: item.sku ?? `${item.name}-${idx}`,
                units: item.quantity || 1,
                selling_price: item.price || 0,
                // discount: item.discount || 0,
                tax: item.taxRate || 0,
                hsn: item.hsnCode,
                order_id: order.id,
                length: Number(data.packageDetails.length || 0),
                breadth: Number(data.packageDetails.breadth || 0),
                height: Number(data.packageDetails.height || 0),
                weight: Number(data.packageDetails.deadWeight || 0),
              })) || [];

            if (orderItems.length > 0) {
              await tx.orderItem.createMany({
                data: orderItems,
                skipDuplicates: true,
              });
            }

            // Invalidate relevant caches
            await appCache.invalidateUserCache(userId);
            await appCache.invalidateDashboardMetrics(userId);

            return order;
          },
          {
            // OPTIMIZATION 7: Configure transaction settings
            maxWait: 5000,
            timeout: 10000,
            isolationLevel: 'ReadCommitted',
          }
        );
      } catch (error: any) {
        // Handle duplicate code error with retry
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && (error.meta?.target as string[])?.includes?.('code')) {
          attempt += 1;
          await new Promise((res) => setTimeout(res, 10));
          continue;
        }

        // Specific error handling
        if (error.message === 'Order Id already exists. Please try with another Order Id.') {
          throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          const errorMap = {
            P2002: 'A conflict occurred: An order or related record already exists.',
            P2025: 'Required record not found: Customer, address, or hub does not exist.',
            P2003: 'Foreign key constraint failed: Invalid reference to related record.',
            P2034: 'Transaction failed due to a write conflict or deadlock. Please retry.',
          } as const;
          throw new Error(errorMap[error.code as keyof typeof errorMap] || `Database error: ${error.message}`);
        }

        throw new Error(
          error instanceof Error ? `Failed to create order: ${error.message}` : 'An unexpected error occurred while creating the order. Please try again.'
        );
      }
    }

    throw new Error('Failed to create order after multiple retries due to duplicate code.');
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
            getPincodeDetails(data.sellerDetails.pincode || '000000'),
            getPincodeDetails(
              data.deliveryDetails.billingIsSameAsDelivery || false ? data.deliveryDetails.pincode || '000000' : data.deliveryDetails.billingPincode || '000000'
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
                type: AddressType.CUSTOMER,
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
                type: AddressType.SELLER,
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
              payment_method: (data.paymentMethod.paymentMethod?.toUpperCase() as PaymentMethod) || 'COD',
              total_amount: data.productDetails.taxableValue,
              amount_to_collect: data.amountToCollect,
              applicable_weight: applicableWeight,
              ewaybill: data.ewaybill,
              hub_id: data.pickupAddressId,
              type: data.orderType === 'domestic' ? 'B2C' : 'B2B',
              order_invoice_number: data.order_invoice_number,
              order_invoice_date: data.order_invoice_date ? new Date(data.order_invoice_date) : undefined,
              order_reference_id: data.orderId,
            },
            select: {
              id: true,
              code: true,
              order_number: true,
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
        throw new Error(errorMap[error.code as keyof typeof errorMap] || `Database error: ${error.message}`);
      }

      throw new Error(
        error instanceof Error ? `Failed to update order: ${error.message}` : 'An unexpected error occurred while updating the order. Please try again.'
      );
    }
  }

  /**
   * Update an order status
   */
  // async updateOrderStatus(id: string, update_data: UpdateOrderFormValues) {
  //   return this.fastify.prisma.order.update({
  //     where: { id },
  //     data: {
  //       status: update_data.status as ShipmentStatus,
  //     },
  //   });
  // }

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
      by: ['payment_method'], // TODO: Change to status
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
    const [total_orders, total_amount_result, status_counts_result] = await Promise.all([total_orders_promise, total_amount_promise, status_counts_promise]);

    // Format status counts
    const status_counts: Record<string, number> = {};
    // status_counts_result.forEach((item) => {
    //   status_counts[item.status as string] = item._count?.id || 0;
    // });

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
