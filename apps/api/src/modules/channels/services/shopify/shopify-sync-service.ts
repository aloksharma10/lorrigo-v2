import { FastifyInstance } from 'fastify';
import { ShopifyChannel } from './shopify-channel';
import { ChannelConnectionService } from '../channel-connection-service';
import { captureException } from '@/lib/sentry';
import { formatPhoneNumber, ShipmentBucketManager } from '@lorrigo/utils';
import { AddressType, Channel, OrderType, ShipmentStatus } from '@lorrigo/db';
import { queueSyncOrders } from '../../queues/shopifySyncQueue';

export interface ShopifySyncResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class ShopifySyncService {
  private fastify: FastifyInstance;
  private connectionService: ChannelConnectionService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.connectionService = new ChannelConnectionService();
  }

  /**
   * Sync orders from Shopify to local database using queue system
   * @param userId User ID
   * @param params Query parameters for fetching orders
   * @returns Promise resolving to sync job queued result
   */
  public async syncOrdersFromShopify(userId: string, params: Record<string, string | number> = {}): Promise<ShopifySyncResult> {
    try {
      // Validate Shopify connection
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(userId, Channel.SHOPIFY);
      if (!connection || !connection.shop) {
        return {
          success: false,
          message: 'Shopify connection not found',
          error: 'No active Shopify connection found for this user',
        };
      }

      // Validate user has primary hub
      const hasPrimaryHub = await this.fastify.prisma.hub.findFirst({
        where: {
          user_id: userId,
          is_primary: true,
          is_active: true,
        },
      });

      if (!hasPrimaryHub) {
        return {
          success: false,
          message: 'No primary hub found for user',
          error: 'No primary hub found for user',
        };
      }

      // Queue the sync job
      const jobId = await queueSyncOrders(userId, params);

      this.fastify.log.info('Shopify sync job queued successfully', {
        userId,
        jobId,
        params,
      });

      return {
        success: true,
        message: 'Sync job queued successfully. You will see Shopify orders on your panel shortly.',
        data: { jobId },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.fastify.log.error('Failed to queue Shopify sync job:', error);
      captureException(error as Error);

      return {
        success: false,
        message: 'Failed to queue sync job',
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch a batch of orders from Shopify with pagination
   * @param shopifyChannel Shopify channel instance
   * @param params Query parameters
   * @param pageInfo Pagination information
   * @returns Promise resolving to orders array
   */
  private async fetchOrdersBatch(shopifyChannel: ShopifyChannel, params: Record<string, string | number>, pageInfo?: any): Promise<any[]> {
    try {
      // Add pagination parameters if available
      const queryParams = { ...params };
      if (pageInfo?.nextPageUrl) {
        // Extract parameters from next page URL
        const url = new URL(pageInfo.nextPageUrl);
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
      }

      const orders = await shopifyChannel.getOrders(queryParams);
      return orders || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process a batch of orders efficiently
   * @param orders Array of Shopify orders
   * @param userId User ID
   * @param shop Shop domain
   * @param processedOrders Set of already processed order IDs
   * @returns Promise resolving to batch result
   */
  private async processOrdersBatch(
    orders: any[],
    userId: string,
    shop: string,
    processedOrders: Set<string>
  ): Promise<{ synced: number; skipped: number; errors: number }> {
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // Check for existing orders in bulk to avoid individual queries
    const orderIds = orders.map((order) => order.id.toString());
    const existingOrders = await this.fastify.prisma.order.findMany({
      where: {
        user_id: userId,
        order_channel_config: {
          channel: 'SHOPIFY',
          channel_order_id: { in: orderIds },
        },
      },
      select: {
        order_channel_config: {
          select: { channel_order_id: true },
        },
      },
    });

    const existingOrderIds = new Set(existingOrders.map((order) => order.order_channel_config.channel_order_id));

    // Process orders in parallel with limited concurrency
    const concurrencyLimit = 10; // Process 10 orders simultaneously
    const chunks = this.chunkArray(orders, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (order) => {
        try {
          // Skip if already processed or exists
          if (processedOrders.has(order.id.toString()) || existingOrderIds.has(order.id.toString())) {
            return { action: 'skipped', orderId: order.id };
          }

          // Process the order
          const result = await this.processShopifyOrder(order, userId, shop);
          processedOrders.add(order.id.toString());
          return result;
        } catch (error) {
          return { action: 'error', orderId: order.id, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);

      // Count results
      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.action === 'created' || data.action === 'updated') {
            synced++;
          } else if (data.action === 'skipped') {
            skipped++;
          } else if (data.action === 'error') {
            errors++;
          }
        } else {
          errors++;
        }
      });

      // Small delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return { synced, skipped, errors };
  }

  /**
   * Extract pagination information from orders response
   * @param orders Orders array
   * @returns Pagination info object
   */
  private extractPageInfo(orders: any[]): any {
    // This is a simplified implementation
    // In a real implementation, you'd extract pagination info from Shopify's response headers
    return {
      hasNext: orders.length > 0, // Simplified logic
      nextPageUrl: null, // Would be extracted from Link header
    };
  }

  /**
   * Split array into chunks
   * @param array Input array
   * @param chunkSize Size of each chunk
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Send tracking information to Shopify when courier is assigned
   * @param orderId Local order ID
   * @param trackingNumber AWB/Tracking number
   * @param trackingUrl Tracking URL
   * @param tags Optional tags to add
   * @returns Promise resolving to tracking update result
   */
  public async sendTrackingToShopify(orderId: string, trackingNumber: string, trackingUrl: string, tags?: string[]): Promise<ShopifySyncResult> {
    try {
      // Get the order with channel information
      const order = await this.fastify.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          order_channel_config: true,
          user: true,
        },
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          error: 'Order does not exist',
        };
      }

      // Check if this is a Shopify order
      if (order.order_channel_config.channel !== Channel.SHOPIFY) {
        return {
          success: false,
          message: 'Not a Shopify order',
          error: 'This order is not from Shopify',
        };
      }

      // Get Shopify connection
      const connection = await this.connectionService.getConnectionByUserIdAndChannel(order.user_id, Channel.SHOPIFY);

      if (!connection || !connection.shop) {
        return {
          success: false,
          message: 'Shopify connection not found',
          error: 'No active Shopify connection found',
        };
      }

      // Get the Shopify order ID from the channel config
      const shopifyOrderId = order.order_channel_config.channel_order_id;
      if (!shopifyOrderId) {
        return {
          success: false,
          message: 'Shopify order ID not found',
          error: 'No Shopify order ID associated with this order',
        };
      }

      // Create Shopify channel instance
      const shopifyChannel = new ShopifyChannel(connection.shop, order.user_id, this.fastify, connection.access_token);

      // Send tracking to Shopify
      const result = await shopifyChannel.sendTrackingToShopify(shopifyOrderId, trackingNumber, trackingUrl, tags);

      if (result.success) {
        // Log the tracking update
        await this.logTrackingUpdate(orderId, shopifyOrderId, trackingNumber, trackingUrl, tags);

        return {
          success: true,
          message: 'Tracking information sent to Shopify successfully',
          data: result.fulfillment,
        };
      } else {
        return {
          success: false,
          message: 'Failed to send tracking to Shopify',
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      captureException(error as Error);

      return {
        success: false,
        message: 'Failed to send tracking to Shopify',
        error: errorMessage,
      };
    }
  }

  /**
   * Process a single Shopify order and sync to local database
   * @param shopifyOrder Shopify order data
   * @param userId User ID
   * @param shop Shop domain
   * @returns Promise resolving to processing result
   */
  public async processShopifyOrder(shopifyOrder: any, userId: string, shop: string): Promise<{ action: 'created' | 'updated'; orderId: string }> {
    // Check if order already exists
    const existingOrder = await this.fastify.prisma.order.findFirst({
      where: {
        user_id: userId,
        order_channel_config: {
          channel: 'SHOPIFY',
          channel_order_id: shopifyOrder.id.toString(),
        },
      },
    });

    if (existingOrder) {
      // Update existing order if needed
      await this.updateExistingOrder(existingOrder.id, shopifyOrder);
      return { action: 'updated', orderId: existingOrder.id };
    } else {
      // Create new order
      await this.createNewOrder(shopifyOrder, userId, shop);

      // Get the created order ID
      // const createdOrder = await this.fastify.prisma.order.findFirst({
      //   where: {
      //     user_id: userId,
      //     order_channel_config: {
      //       channel: 'SHOPIFY',
      //       channel_order_id: shopifyOrder.id.toString(),
      //     },
      //   },
      // });

      return { action: 'created', orderId: 'N/A' };
    }
  }

  /**
   * Create a new order from Shopify data
   * @param shopifyOrder Shopify order data
   * @param userId User ID
   * @param shop Shop domain
   */
  private async createNewOrder(shopifyOrder: any, userId: string, shop: string): Promise<void> {
    try {
      // Import required utilities
      const { generateId, getFinancialYear } = await import('@lorrigo/utils');

      // Get user's primary hub for seller details
      const userHub = await this.fastify.prisma.hub.findFirst({
        where: {
          user_id: userId,
          is_primary: true,
          is_active: true,
        },
        include: {
          address: true,
        },
      });

      if (!userHub) {
        throw new Error('No primary hub found for user');
      }

      // Get user details for seller information
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get sequence numbers for ID generation
      const [orderCount, customerCount, packageCount, itemCount] = await Promise.all([
        this.fastify.prisma.order.count({
          where: {
            user_id: userId,
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
        this.fastify.prisma.customer.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
        this.fastify.prisma.package.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
        this.fastify.prisma.orderItem.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
      ]);

      // Generate IDs
      const orderCode = generateId({
        tableName: 'order',
        entityName: 'Shopify Order',
        lastUsedFinancialYear: getFinancialYear(new Date()),
        lastSequenceNumber: orderCount,
      }).id;

      const packageCode = generateId({
        tableName: 'package',
        entityName: 'Shopify Package',
        lastUsedFinancialYear: getFinancialYear(new Date()),
        lastSequenceNumber: packageCount,
      }).id;

      // Extract shipping address (prioritize shipping over default) - based on old code
      const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.customer?.default_address || {};
      const financialStatus = shopifyOrder?.financial_status;

      // Extract note attributes for additional customer info - based on old code
      const noteAttributes = shopifyOrder.note_attributes || [];
      const na_customer = {
        name: noteAttributes.find((na: any) => na.name === 'Full name')?.value || '',
        phone: noteAttributes.find((na: any) => na.name === 'Phone number')?.value || shippingAddress.phone || '',
        email: shopifyOrder.customer?.email || '',
        address: noteAttributes.find((na: any) => na.name === 'Address')?.value || shippingAddress.address1 || '',
        pincode: noteAttributes.find((na: any) => na.name === 'zip_code')?.value || shippingAddress.zip || '',
        city: noteAttributes.find((na: any) => na.name === 'City')?.value || shippingAddress.city || '',
        state: noteAttributes.find((na: any) => na.name === 'State')?.value || shippingAddress.province || '',
        country: shippingAddress.country || '',
      };

      // Calculate package dimensions and weight from line items - based on old code
      const totalWeight = shopifyOrder.total_weight ? shopifyOrder.total_weight / 1000 : 0; // Convert to kg
      const totalQuantity = shopifyOrder.line_items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1;

      // Standard dimensions if not available - based on old code
      const orderBoxHeight = Math.max(10, Math.sqrt(totalQuantity) * 5); // cm
      const orderBoxWidth = Math.max(10, Math.sqrt(totalQuantity) * 5); // cm
      const orderBoxLength = Math.max(5, Math.sqrt(totalQuantity) * 3); // cm

      // Calculate volumetric weight
      const volumetricWeight = (orderBoxLength * orderBoxWidth * orderBoxHeight) / 5000; // cm³ to kg

      // Use the higher of actual weight and volumetric weight
      const applicableWeight = Math.max(totalWeight, volumetricWeight);

      // Create order in a transaction
      await this.fastify.prisma.$transaction(async (tx) => {
        // 1. Create or find customer - based on old code mapping
        const customerPhone = formatPhoneNumber(shippingAddress.phone || shopifyOrder.customer?.phone || na_customer.phone || '0000000000');
        const customerEmail = shopifyOrder.customer?.email || na_customer.email;

        // Try to find customer by phone first, then by email
        let customer = await tx.customer.findUnique({
          where: { phone: customerPhone },
        });

        if (!customer && customerEmail) {
          // Try to find by email if not found by phone (email is not unique, so use findFirst)
          customer = await tx.customer.findFirst({
            where: { email: customerEmail },
          });
        }

        if (!customer) {
          // Create new customer
          const customerCode = generateId({
            tableName: 'customer',
            entityName: na_customer.name || shopifyOrder.shipping_address?.first_name || 'Customer',
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: customerCount,
          }).id;

          const customerName =
            `${shippingAddress.first_name || shopifyOrder.customer?.first_name || ''} ${shippingAddress.last_name || shopifyOrder.customer?.last_name || na_customer.name || ''}`.trim();

          customer = await tx.customer.create({
            data: {
              id: customerCode,
              name: customerName || 'Shopify Customer',
              email: customerEmail,
              phone: customerPhone,
            },
          });
        } else {
          // Update existing customer with latest information
          const customerName =
            `${shippingAddress.first_name || shopifyOrder.customer?.first_name || ''} ${shippingAddress.last_name || shopifyOrder.customer?.last_name || na_customer.name || ''}`.trim();

          await tx.customer.update({
            where: { id: customer.id },
            data: {
              name: customerName || customer.name, // Keep existing name if new one is empty
              email: customerEmail || customer.email, // Keep existing email if new one is empty
              phone: customerPhone, // Always update phone as it's the primary identifier
              updated_at: new Date(),
            },
          });
        }

        // 2. Create or update customer address - based on old code mapping
        let customerAddress = await tx.address.findUnique({
          where: { customer_id: customer.id },
        });

        if (!customerAddress) {
          // Create new address if customer doesn't have one
          customerAddress = await tx.address.create({
            data: {
              type: AddressType.CUSTOMER,
              name: `${shippingAddress.first_name || shopifyOrder.customer?.first_name || ''} ${shippingAddress.last_name || shopifyOrder.customer?.last_name || na_customer.name || ''}`.trim(),
              address: `${shippingAddress.address1 || na_customer.address || ''} ${shippingAddress.address2 || ''}`.trim(),
              address_2: shippingAddress.address2 || '',
              city: shippingAddress.city || na_customer.city || '',
              state: shippingAddress.province || na_customer.state || '',
              pincode: shippingAddress.zip || na_customer.pincode || '000000',
              phone: customerPhone,
              country: shippingAddress.country || na_customer.country || 'India',
              customer_id: customer.id,
            },
          });
        } else {
          // Update existing address with latest shipping information
          customerAddress = await tx.address.update({
            where: { id: customerAddress.id },
            data: {
              name: `${shippingAddress.first_name || shopifyOrder.customer?.first_name || ''} ${shippingAddress.last_name || shopifyOrder.customer?.last_name || na_customer.name || ''}`.trim(),
              address: `${shippingAddress.address1 || na_customer.address || ''} ${shippingAddress.address2 || ''}`.trim(),
              address_2: shippingAddress.address2 || '',
              city: shippingAddress.city || na_customer.city || '',
              state: shippingAddress.province || na_customer.state || '',
              pincode: shippingAddress.zip || na_customer.pincode || '000000',
              phone: customerPhone,
              country: shippingAddress.country || na_customer.country || 'India',
              updated_at: new Date(),
            },
          });
        }

        // 3. Create package - based on old code mapping
        const packageRecord = await tx.package.create({
          data: {
            id: packageCode,
            weight: totalWeight,
            dead_weight: totalWeight,
            volumetric_weight: volumetricWeight,
            length: orderBoxLength,
            breadth: orderBoxWidth,
            height: orderBoxHeight,
          },
        });

        // 4. Create seller details - based on old code mapping
        const sellerDetails = await tx.orderSellerDetails.create({
          data: {
            seller_name: user.profile?.company_name || user.name || userHub.name,
            contact_number: userHub.phone,
            address_id: userHub.address_id,
          },
        });

        // 5. Create order channel config - based on old code mapping
        const orderChannelConfig = await tx.orderChannelConfig.create({
          data: {
            channel: Channel.SHOPIFY,
            channel_order_id: shopifyOrder.id.toString(),
          },
        });

        // 6. Determine payment method - based on old code mapping
        const paymentMethod = this.mapShopifyPaymentMethod(financialStatus);

        // 7. Calculate amounts - based on old code mapping
        const totalAmount = parseFloat(shopifyOrder.total_price || 0);
        const amountToCollect = this.calculateAmountToCollect(financialStatus, shopifyOrder);

        // 8. Create the order - based on old code mapping
        const order = await tx.order.create({
          data: {
            id: orderCode,
            code: orderCode,
            order_number: shopifyOrder.name || `SHOP-${shopifyOrder.id}`,
            type: OrderType.B2C,
            payment_method: paymentMethod,
            is_reverse_order: false,
            order_channel_config_id: orderChannelConfig.id,
            order_reference_id: shopifyOrder.name, // Based on old code
            total_amount: totalAmount,
            amount_to_collect: amountToCollect,
            applicable_weight: applicableWeight,
            order_invoice_date: new Date(shopifyOrder.created_at),
            order_invoice_number: shopifyOrder.name, // Based on old code
            user_id: userId,
            customer_id: customer.id,
            hub_id: userHub.id,
            seller_details_id: sellerDetails.id,
            package_id: packageRecord.id,
            shipment: {
              create: {
                code: `${shopifyOrder.id}-${orderCode}`,
                user_id: userId,
                status: ShipmentStatus.NEW,
                bucket: ShipmentBucketManager.getBucketFromStatus(ShipmentStatus.NEW),
                tracking_events: {
                  create: [{ description: 'Order Created', status: 'NEW', timestamp: new Date() }],
                },
              },
            },
          },
        });

        // 9. Create order items - based on old code mapping
        for (const lineItem of shopifyOrder.line_items || []) {
          const itemCode = generateId({
            tableName: 'orderItem',
            entityName: lineItem.name || 'Item',
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: itemCount + shopifyOrder.line_items.indexOf(lineItem),
          }).id;

          await tx.orderItem.create({
            data: {
              id: itemCode,
              code: itemCode,
              order_id: order.id,
              name: lineItem.name,
              sku: lineItem.sku || '',
              units: lineItem.quantity,
              selling_price: parseFloat(lineItem.price) || 0,
              discount: 0,
              tax: 0,
              hsn: lineItem.hsn || '',
              // B2C specific dimensions (if available)
              length: lineItem.grams ? Math.sqrt(lineItem.grams / 1000) * 2 : null,
              breadth: lineItem.grams ? Math.sqrt(lineItem.grams / 1000) * 2 : null,
              height: lineItem.grams ? Math.sqrt(lineItem.grams / 1000) : null,
              weight: lineItem.grams ? lineItem.grams / 1000 : null,
            },
          });
        }
      }, {
        timeout: 10000,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate amount to collect based on financial status - based on old code
   * @param financialStatus Shopify financial status
   * @param shopifyOrder Shopify order data
   * @returns Amount to collect
   */
  private calculateAmountToCollect(financialStatus: string, shopifyOrder: any): number {
    if (financialStatus === 'pending') {
      return parseFloat(shopifyOrder?.total_price || '0');
    } else if (financialStatus === 'partially_paid') {
      return parseFloat(shopifyOrder?.total_outstanding || '0');
    }
    return 0;
  }

  /**
   * Update existing order with Shopify data
   * @param orderId Local order ID
   * @param shopifyOrder Shopify order data
   */
  private async updateExistingOrder(orderId: string, shopifyOrder: any): Promise<void> {
    try {
      // Get the existing order with related data
      const existingOrder = await this.fastify.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: true,
          order_channel_config: true,
        },
      });

      if (!existingOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Update order details
      const updateData: any = {
        total_amount: parseFloat(shopifyOrder.total_price) || existingOrder.total_amount,
        order_invoice_date: new Date(shopifyOrder.created_at),
        updated_at: new Date(),
      };

      // Update payment method if financial status changed
      const { PaymentMethod } = await import('@lorrigo/db');
      const newPaymentMethod = this.mapShopifyPaymentMethod(shopifyOrder.financial_status);
      if (newPaymentMethod !== existingOrder.payment_method) {
        updateData.payment_method = newPaymentMethod;
        updateData.amount_to_collect = newPaymentMethod === PaymentMethod.COD ? updateData.total_amount : 0;
      }

      // Update the order
      await this.fastify.prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });

      // Update customer information if changed
      if (shopifyOrder.email && shopifyOrder.email !== existingOrder.customer.email) {
        await this.fastify.prisma.customer.update({
          where: { id: existingOrder.customer.id },
          data: {
            email: shopifyOrder.email,
            updated_at: new Date(),
          },
        });
      }

      // Update customer address if shipping address changed
      if (shopifyOrder.shipping_address) {
        const customerAddress = await this.fastify.prisma.address.findUnique({
          where: { customer_id: existingOrder.customer.id },
        });

        if (customerAddress) {
          await this.fastify.prisma.address.update({
            where: { id: customerAddress.id },
            data: {
              name: `${shopifyOrder.shipping_address.first_name || ''} ${shopifyOrder.shipping_address.last_name || ''}`.trim(),
              address: shopifyOrder.shipping_address.address1 || customerAddress.address,
              address_2: shopifyOrder.shipping_address.address2 || customerAddress.address_2,
              city: shopifyOrder.shipping_address.city || customerAddress.city,
              state: shopifyOrder.shipping_address.province || customerAddress.state,
              pincode: shopifyOrder.shipping_address.zip || customerAddress.pincode,
              phone: shopifyOrder.shipping_address.phone || shopifyOrder.phone || customerAddress.phone,
              updated_at: new Date(),
            },
          });
        }
      }

      // Update order items if they changed
      // Note: This is a simplified update. You might want to implement more sophisticated item comparison
      if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
        // For now, we'll just log that items exist
        // In a more sophisticated implementation, you'd compare and update individual items
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log tracking update for audit purposes
   * @param orderId Local order ID
   * @param shopifyOrderId Shopify order ID
   * @param trackingNumber Tracking number
   * @param trackingUrl Tracking URL
   * @param tags Tags added
   */
  private async logTrackingUpdate(orderId: string, shopifyOrderId: string, trackingNumber: string, trackingUrl: string, tags?: string[]): Promise<void> {
    try {
      // TODO: Add to database log table if needed
    } catch (error) {
      console.error('Error logging tracking update:', error);
    }
  }

  /**
   * Map Shopify payment status to local payment method - based on old code
   * @param financialStatus Shopify financial status
   * @returns PaymentMethod enum value
   */
  private mapShopifyPaymentMethod(financialStatus: string): any {
    const { PaymentMethod } = require('@lorrigo/db');

    // Based on old code: payment_mode :["pending", "partially_paid"].includes(financialStatus) ? 1 : 0
    switch (financialStatus?.toLowerCase()) {
      case 'paid':
        return PaymentMethod.PREPAID;
      case 'pending':
      case 'partially_paid':
      case 'partially_refunded':
      case 'refunded':
        return PaymentMethod.COD;
      default:
        return PaymentMethod.COD;
    }
  }
}
