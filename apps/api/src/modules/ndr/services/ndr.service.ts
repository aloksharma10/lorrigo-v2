import { FastifyInstance } from 'fastify';
import { NDRData, VendorNDRResult } from '@/types/vendor';
import { VendorService } from '../../vendors/vendor.service';
import { QueueNames, addJob } from '@/lib/queue';
import { ShipmentStatus } from '@lorrigo/db';
import { generateId, getFinancialYear } from '@lorrigo/utils';

/**
 * NDR Service for handling Non-Delivery Report actions
 * Provides high-level NDR operations with queue integration for scalability
 */
export class NDRService {
  private fastify: FastifyInstance;
  private vendorService: VendorService;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.vendorService = new VendorService(fastify);
  }

  /**
   * Take NDR action for a single shipment
   * @param ndrId NDR record ID
   * @param actionType Action type (reattempt, return, cancel, fake-attempt)
   * @param comment Action comment
   * @param userId User ID taking the action
   * @param nextAttemptDate Next attempt date for reattempt actions
   * @returns Promise resolving to action result
   */
  public async takeNDRAction(
    ndrId: string,
    actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt',
    comment: string,
    userId: string,
    nextAttemptDate?: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // Get NDR record with related shipment and order data
      const ndrRecord = await this.fastify.prisma.nDROrder.findUnique({
        where: { id: ndrId },
        include: {
          shipment: {
            include: {
              order: {
                include: {
                  customer: {
                    include: {
                      address: true,
                    },
                  },
                },
              },
              courier: {
                include: {
                  channel_config: true,
                },
              },
            },
          },
          order: {
            include: {
              customer: {
                include: {
                  address: true,
                },
              },
            },
          },
        },
      });

      if (!ndrRecord) {
        return {
          success: false,
          message: 'NDR record not found',
        };
      }

      // Check if action has already been taken
      if (ndrRecord.action_taken) {
        return {
          success: false,
          message: `NDR action already taken: ${ndrRecord.action_type}`,
        };
      }

      // Get vendor name from courier configuration
      const vendorName = ndrRecord.shipment?.courier?.channel_config?.name;
      if (!vendorName) {
        return {
          success: false,
          message: 'Courier vendor information not found',
        };
      }

      // Prepare NDR data for vendor API
      const ndrData: NDRData = {
        order_id: ndrRecord.order_id || ndrRecord.shipment?.order?.id || '',
        awb: ndrRecord.awb,
        action: actionType,
        comment,
        customer_name: ndrRecord.shipment?.order?.customer?.name || ndrRecord.order?.customer?.name,
        phone: ndrRecord.shipment?.order?.customer?.phone || ndrRecord.order?.customer?.phone,
        address: ndrRecord.shipment?.order?.customer?.address?.address || ndrRecord.order?.customer?.address?.address,
        next_attempt_date: nextAttemptDate,
        client_order_reference_id: ndrRecord.shipment?.order?.order_reference_id || ndrRecord.order?.order_reference_id || "",
        // @ts-ignore
        shipment: ndrRecord.shipment ? {
          id: ndrRecord.shipment.id,
          order: {
            id: ndrRecord.shipment.order?.id || '',
            code: ndrRecord.shipment.order?.code || '',
            order_reference_id: ndrRecord.shipment.order?.order_reference_id,
            customer: ndrRecord.shipment.order?.customer ? {
              name: ndrRecord.shipment.order.customer.name,
              phone: ndrRecord.shipment.order.customer.phone,
              address: {
                address: ndrRecord.shipment.order.customer.address?.address || '',
                city: ndrRecord.shipment.order.customer.address?.city || '',
                state: ndrRecord.shipment.order.customer.address?.state || '',
                pincode: ndrRecord.shipment.order.customer.address?.pincode || '',
              },
            } : undefined,
          },
        } : undefined,
      };

      // Process NDR action via vendor service
      const result = await this.vendorService.handleNDRAction(vendorName, ndrData);

      if (result.success) {
        // Update NDR record with action details
        await this.fastify.prisma.nDROrder.update({
          where: { id: ndrId },
          data: {
            action_taken: true,
            action_type: actionType,
            action_comment: comment,
            action_date: new Date(),
            updated_at: new Date(),
          },
        });

        // Create NDR history record
        await this.fastify.prisma.nDRHistory.create({
          data: {
            ndr_id: ndrId,
            ndr_reason: `NDR action: ${actionType}`,
            comment,
            ndr_raised_at: new Date(),
          },
        });

        // Update shipment status if needed
        if (ndrRecord.shipment_id) {
          let newStatus: ShipmentStatus | undefined;
          switch (actionType) {
            case 'return':
              newStatus = ShipmentStatus.RTO;
              break;
            // For reattempt and fake-attempt, keep current status
          }

          if (newStatus) {
            await this.fastify.prisma.shipment.update({
              where: { id: ndrRecord.shipment_id },
              data: {
                status: newStatus,
                updated_at: new Date(),
              },
            });

            // Also update order status
            if (ndrRecord.order_id) {
              await this.fastify.prisma.order.update({
                where: { id: ndrRecord.order_id },
                data: {
                  status: newStatus,
                  updated_at: new Date(),
                },
              });
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error taking NDR action:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to take NDR action',
      };
    }
  }

  /**
   * Process NDR actions in batch using queue
   * @param ndrActions Array of NDR actions to process
   * @param userId User ID initiating the batch
   * @returns Promise resolving to operation ID for tracking
   */
  public async processNDRActionsBatch(
    ndrActions: Array<{
      ndrId: string;
      actionType: 'reattempt' | 'return' | 'cancel' | 'fake-attempt';
      comment: string;
      nextAttemptDate?: string;
    }>,
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    operationId: string;
  }> {  
    try {
      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          code: generateId({
            tableName: 'bulk_operation',
            entityName: 'bulk_operation',
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: Math.floor(Math.random() * 1000000),
          }).id,
          type: 'NDR_ACTION',
          status: 'PENDING',
          // total_items: ndrActions.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          user_id: userId,
          // : JSON.stringify({
          //   ndrActions: ndrActions.map(action => ({
          //     ndrId: action.ndrId,
          //     actionType: action.actionType,
          //     comment: action.comment,
          //     nextAttemptDate: action.nextAttemptDate,
          //   })),
          // }),
        },
      });

      // Add job to queue for processing
      await addJob(
        QueueNames.NDR_PROCESSING,
        'process-ndr-actions-batch',
        {
          operationId: bulkOperation.id,
          ndrActions,
          userId,
        },
        {
          priority: 1, // High priority for NDR actions
          attempts: 3,
        }
      );

      return {
        success: true,
        message: 'NDR actions batch queued for processing',
        operationId: bulkOperation.id,
      };
    } catch (error) {
      console.error('Error queuing NDR actions batch:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to queue NDR actions batch',
        operationId: '',
      };
    }
  }

  /**
   * Get NDR records with filtering and pagination
   * @param userId User ID
   * @param filters Filtering options
   * @param page Page number
   * @param limit Items per page
   * @returns Promise resolving to NDR records with pagination info
   */
  public async getNDROrders(
    userId: string,
    filters: {
      status?: string;
      awb?: string;
      startDate?: Date;
      endDate?: Date;
      actionTaken?: boolean;
      actionType?: string;
    } = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{
    success: boolean;
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      // Filter by user's orders/shipments
      where.OR = [
        {
          order: {
            user_id: userId,
          },
        },
        {
          shipment: {
            order: {
              user_id: userId,
            },
          },
        },
      ];

      if (filters.awb) {
        where.awb = {
          contains: filters.awb,
          mode: 'insensitive',
        };
      }

      if (filters.actionTaken !== undefined) {
        where.action_taken = filters.actionTaken;
      }

      if (filters.actionType) {
        where.action_type = filters.actionType;
      }

      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) {
          where.created_at.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.created_at.lte = filters.endDate;
        }
      }

      // Get total count and paginated results
      const [total, ndrOrders] = await Promise.all([
        this.fastify.prisma.nDROrder.count({ where }),
        this.fastify.prisma.nDROrder.findMany({
          where,
          include: {
            order: {
              include: {
                customer: {
                  include: {
                    address: true,
                  },
                },
              },
            },
            shipment: {
              include: {
                order: {
                  include: {
                    customer: {
                      include: {
                        address: true,
                      },
                    },
                  },
                },
                courier: {
                  include: {
                    channel_config: true,
                  },
                },
              },
            },
            customer: {
              include: {
                address: true,
              },
            },
            courier: {
              include: {
                channel_config: true,
              },
            },
            ndr_history: {
              orderBy: {
                created_at: 'desc',
              },
              take: 5, // Latest 5 history entries
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          skip,
          take: limit,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: ndrOrders,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('Error getting NDR orders:', error);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  /**
   * Create NDR record for a shipment
   * @param data NDR creation data
   * @param userId User ID
   * @returns Promise resolving to NDR creation result
   */
  public async createNDRRecord(
    data: {
      shipmentId?: string;
      orderId?: string;
      customerId: string;
      courierId?: string;
      awb: string;
      cancellationReason?: string;
      ndrRaisedAt?: Date;
    },
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    ndr?: any;
  }> {
    try {
      // Check if NDR already exists for this AWB
      const existingNDR = await this.fastify.prisma.nDROrder.findFirst({
        where: { awb: data.awb },
      });

      if (existingNDR) {
        return {
          success: false,
          message: 'NDR record already exists for this AWB',
        };
      }

      // Create NDR record
      const ndrRecord = await this.fastify.prisma.nDROrder.create({
        data: {
          order_id: data.orderId,
          shipment_id: data.shipmentId,
          customer_id: data.customerId,
          courier_id: data.courierId,
          awb: data.awb,
          cancellation_reason: data.cancellationReason,
          ndr_raised_at: data.ndrRaisedAt || new Date(),
          attempts: 1,
          action_taken: false,
        },
        include: {
          order: true,
          shipment: true,
          customer: true,
          courier: true,
        },
      });

      // Create initial NDR history entry
      await this.fastify.prisma.nDRHistory.create({
        data: {
          ndr_id: ndrRecord.id,
          ndr_reason: data.cancellationReason || 'NDR raised',
          ndr_raised_at: data.ndrRaisedAt || new Date(),
        },
      });

      return {
        success: true,
        message: 'NDR record created successfully',
        ndr: ndrRecord,
      };
    } catch (error) {
      console.error('Error creating NDR record:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create NDR record',
      };
    }
  }

  /**
   * Get bulk operation status for NDR actions
   * @param operationId Bulk operation ID
   * @param userId User ID
   * @returns Promise resolving to operation status
   */
  public async getBulkOperationStatus(
    operationId: string,
    userId: string
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id: operationId,
          user_id: userId,
          type: 'NDR_ACTION',
        },
      });

      if (!operation) {
        return {
          success: false,
          message: 'Bulk operation not found',
        };
      }

      return {
        success: true,
        data: operation,
      };
    } catch (error) {
      console.error('Error getting bulk operation status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get operation status',
      };
    }
  }
} 