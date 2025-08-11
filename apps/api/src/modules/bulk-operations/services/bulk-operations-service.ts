import { FastifyInstance } from 'fastify';
import fs from 'fs';
import { ShipmentService } from '@/modules/shipments/services/shipmentService';
import { addJob, QueueNames } from '@/lib/queue';
import { JobType } from '@/modules/shipments/queues/shipmentQueue';
import { OrderService } from '@/modules/orders/services/order-service';
import { randomUUID } from 'crypto';
import { BillingJobType } from '@/modules/billing/queues/billingQueue';
import csv from 'csvtojson';
import { ShipmentBucket } from '@lorrigo/utils';

/**
 * Service for handling bulk operations
 */
export class BulkOperationsService {
  private shipmentService: ShipmentService;

  constructor(private fastify: FastifyInstance) {
    const orderService = new OrderService(fastify);
    this.shipmentService = new ShipmentService(fastify, orderService);
  }

  /**
   * Get all bulk operations with pagination and filters
   */
  async getAllBulkOperations(userId: string, page: number = 1, pageSize: number = 10, type?: string, status?: string, dateRange?: [Date, Date]) {
    try {
      // Build where clause
      const where: any = { user_id: userId };

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      if (dateRange && dateRange.length === 2) {
        where.created_at = {
          gte: dateRange[0],
          lte: dateRange[1],
        };
      }

      // Count total operations matching the criteria
      const total = await this.fastify.prisma.bulkOperation.count({ where });

      // Calculate pagination
      const skip = (page - 1) * pageSize;
      const pageCount = Math.ceil(total / pageSize);

      // Fetch operations
      const operations = await this.fastify.prisma.bulkOperation.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      });

      return {
        data: operations,
        meta: {
          total,
          pageCount,
          page,
          pageSize,
        },
      };
    } catch (error: any) {
      this.fastify.log.error(`Error getting bulk operations: ${error.message}`);
      throw new Error(`Failed to get bulk operations: ${error.message}`);
    }
  }

  /**
   * Get a specific bulk operation by ID
   */
  async getBulkOperation(id: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!operation) {
        throw new Error('Bulk operation not found');
      }

      return operation;
    } catch (error: any) {
      this.fastify.log.error(`Error getting bulk operation: ${error.message}`);
      throw new Error(`Failed to get bulk operation: ${error.message}`);
    }
  }

  /**
   * Download a bulk operation report
   */
  async downloadReport(id: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!operation) {
        throw new Error('Bulk operation not found');
      }

      if (!operation.report_path) {
        throw new Error('Report not available for this operation');
      }

      const filePath = operation.report_path;
      const fileName = `bulk_operation_${operation.code}.csv`;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('Report file not found');
      }

      return { filePath, fileName };
    } catch (error: any) {
      this.fastify.log.error(`Error downloading report: ${error.message}`);
      throw new Error(`Failed to download report: ${error.message}`);
    }
  }

  /**
   * Download a bulk operation file (e.g., PDF labels)
   */
  async downloadFile(id: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!operation) {
        throw new Error('Bulk operation not found');
      }

      if (!operation.file_path) {
        throw new Error('File not available for this operation');
      }

      const filePath = operation.file_path;
      const fileName = `bulk_operation_${operation.code}.pdf`;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      return { filePath, fileName };
    } catch (error: any) {
      this.fastify.log.error(`Error downloading file: ${error.message}`);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Create bulk shipments
   */
  async createBulkShipments(
    data: {
      shipments?: any[];
      order_ids?: string[];
      courier_ids?: string[];
      is_schedule_pickup?: boolean;
      pickup_date?: string;
      filters?: {
        status?: string;
        dateRange?: [Date, Date];
      };
    },
    userId: string
  ) {
    const shipment = await this.shipmentService.createShipmentBulk(data, userId);
    return {
      operationId: shipment.operation?.id,
      operation: shipment.operation,
    };
  }

  /**
   * Schedule bulk pickups
   */
  async scheduleBulkPickups(data: { shipment_ids: any[]; pickup_date: string }, userId: string) {
    try {
      // Validate input
      if (!data.shipment_ids || !Array.isArray(data.shipment_ids) || data.shipment_ids.length === 0) {
        throw new Error('Invalid pickup data');
      }

      // Create a bulk operation record
      const operationCode = this.generateOperationCode();
      const operation = await this.fastify.prisma.bulkOperation.create({
        data: {
          type: 'SCHEDULE_PICKUP',
          status: 'PENDING',
          code: operationCode,
          user_id: userId,
          total_count: data.shipment_ids.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Add job to the queue using the addJob helper
      await addJob(
        QueueNames.BULK_OPERATION,
        JobType.BULK_SCHEDULE_PICKUP,
        {
          data: data.shipment_ids,
          pickup_date: data.pickup_date,
          userId,
          operationId: operation.id,
        },
        {
          attempts: 3,
        }
      );

      return {
        success: true,
        operation,
      };
    } catch (error) {
      this.fastify.log.error(`Error scheduling bulk pickups: ${error}`);
      throw error;
    }
  }

  /**
   * Cancel bulk shipments
   */
  async cancelBulkShipments(data: { shipment_ids: any[]; reason: string }, userId: string) {
    try {
      // Validate input
      if (!data.shipment_ids || !Array.isArray(data.shipment_ids) || data.shipment_ids.length === 0) {
        throw new Error('Invalid shipment data');
      }

      // Create a bulk operation record
      const operationCode = this.generateOperationCode();
      const operation = await this.fastify.prisma.bulkOperation.create({
        data: {
          type: 'CANCEL_SHIPMENT',
          status: 'PENDING',
          code: operationCode,
          user_id: userId,
          total_count: data.shipment_ids.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Add job to the queue using the addJob helper
      await addJob(
        QueueNames.BULK_OPERATION,
        JobType.BULK_CANCEL_SHIPMENT,
        {
          data: data.shipment_ids,
          reason: data.reason,
          userId,
          operationId: operation.id,
        },
        {
          attempts: 3,
        }
      );

      return {
        success: true,
        operation,
      };
    } catch (error) {
      this.fastify.log.error(`Error cancelling bulk shipments: ${error}`);
      throw error;
    }
  }

  /**
   * Generate bulk labels
   */
  async generateBulkLabels(data: { shipments: any[] }, userId: string) {
    try {
      // Validate input
      if (!data.shipments || !Array.isArray(data.shipments) || data.shipments.length === 0) {
        throw new Error('Invalid shipment data');
      }

      // Create a bulk operation record
      const operationCode = this.generateOperationCode();
      const operation = await this.fastify.prisma.bulkOperation.create({
        data: {
          type: 'DOWNLOAD_LABEL',
          status: 'PENDING',
          code: operationCode,
          user_id: userId,
          total_count: data.shipments.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Add job to the queue using the addJob helper
      await addJob(
        QueueNames.BULK_OPERATION,
        JobType.BULK_DOWNLOAD_LABEL,
        {
          data: data.shipments,
          userId,
          operationId: operation.id,
        },
        {
          attempts: 3,
        }
      );

      return {
        success: true,
        operation,
      };
    } catch (error) {
      this.fastify.log.error(`Error generating bulk labels: ${error}`);
      throw error;
    }
  }

  /**
   * Edit bulk pickup addresses
   */
  async editBulkPickupAddresses(data: { shipments: any[] }, userId: string) {
    try {
      // Validate input
      if (!data.shipments || !Array.isArray(data.shipments) || data.shipments.length === 0) {
        throw new Error('Invalid shipment data');
      }

      // Create a bulk operation record
      const operationCode = this.generateOperationCode();
      const operation = await this.fastify.prisma.bulkOperation.create({
        data: {
          type: 'EDIT_PICKUP_ADDRESS',
          status: 'PENDING',
          code: operationCode,
          user_id: userId,
          total_count: data.shipments.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Add job to the queue using the addJob helper
      await addJob(
        QueueNames.BULK_OPERATION,
        JobType.BULK_EDIT_PICKUP_ADDRESS,
        {
          data: data.shipments,
          userId,
          operationId: operation.id,
        },
        {
          attempts: 3,
        }
      );

      return {
        success: true,
        operation,
      };
    } catch (error) {
      this.fastify.log.error(`Error editing bulk pickup addresses: ${error}`);
      throw error;
    }
  }

  /**
   * Bulk edit order details (pickup hub, weight, and dimensions)
   * Supports selection by specific order_ids or by filters (status/dateRange/channel)
   */
  async editOrderDetails(
    data: {
      order_ids?: string[];
      updates: { hub_id?: string; weight?: number; length?: number; breadth?: number; height?: number };
      filters?: {
        status?: string;
        dateRange?: [Date | undefined, Date | undefined];
        channel?: string; // prisma enum Channel as string
      };
    },
    userId: string
  ) {
    const { order_ids = [], updates, filters } = data;

    // Build list of orders
    let ordersToProcess: string[] = [];
    if (order_ids.length > 0) {
      const orders = await this.fastify.prisma.order.findMany({
        where: { id: { in: order_ids }, shipment: { status: 'NEW', bucket: ShipmentBucket.NEW }, user_id: userId },
        select: { id: true },
      });
      ordersToProcess = orders.map((o) => o.id);
    } else if (filters) {
      const where: any = { user_id: userId };
      if (filters.status) where.status = filters.status;
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        where.created_at = { gte: filters.dateRange[0], lte: filters.dateRange[1] };
      }
      if (filters.channel) {
        where.order_channel_config = { channel: filters.channel };
      }
      const orders = await this.fastify.prisma.order.findMany({ where, select: { id: true }, take: 2000 });
      ordersToProcess = orders.map((o) => o.id);
    }

    if (ordersToProcess.length === 0) {
      throw new Error('No orders found to update');
    }

    const operationCode = this.generateOperationCode();
    const operation = await this.fastify.prisma.bulkOperation.create({
      data: {
        type: 'EDIT_ORDER_DETAILS',
        status: 'PENDING',
        code: operationCode,
        user_id: userId,
        total_count: ordersToProcess.length,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
      },
    });

    // Prepare queue payload items
    const items = ordersToProcess.map((id) => ({ order_id: id, ...updates, hub_id: updates.hub_id }));

    await addJob(
      QueueNames.BULK_OPERATION,
      JobType.BULK_EDIT_ORDER_DETAILS,
      {
        data: items,
        userId,
        operationId: operation.id,
      },
      { attempts: 3 }
    );

    return { success: true, operation };
  }

  /**
   * Generate a unique operation code
   */
  private generateOperationCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomUUID()?.split('-')?.[0]?.toUpperCase();
    return `BLK-${timestamp}-${random}`;
  }

  async createWeightChargeBulk(csvPath: string, userId: string) {
    const csvData = await csv().fromFile(csvPath);

    // Enhanced logging for CSV processing
    this.fastify.log.info(`Processing weight charge CSV with ${csvData.length} rows from file: ${csvPath}`);

    // Generate a unique ID for the operation
    const operationId = randomUUID();

    // Create bulk operation record
    const operation = await this.fastify.prisma.bulkOperation.create({
      data: {
        id: operationId,
        type: 'BILLING_WEIGHT_CSV',
        status: 'PENDING',
        code: this.generateOperationCode(),
        user_id: userId,
        total_count: csvData.length,
        file_path: csvPath,
      },
    });

    // Transform CSV data to ensure correct field names with improved handling
    const formattedData = csvData.map((row) => ({
      AWB: row.AWB || row.awb || row['Awb Number'] || row['AWB Number'] || '',
      Charged_Weight: parseFloat(row['Charged_Weight'] || row['Charged Weight'] || row['charged_weight'] || row['weight'] || '0'),
      evidence_url: row.evidence_url || row.Evidence || row['Evidence URL'] || '',
    }));

    // Log sample of formatted data for debugging
    this.fastify.log.info(`Formatted CSV data sample: ${JSON.stringify(formattedData.slice(0, 2))}`);
    this.fastify.log.info(`Queueing job to process ${formattedData.length} weight dispute entries`);

    // Add job with high priority and immediate processing
    const job = await addJob(
      QueueNames.BILLING_AUTOMATION,
      BillingJobType.PROCESS_WEIGHT_CSV,
      {
        csvData: formattedData,
        operationId: operation.id,
      },
      {
        priority: 1,
        attempts: 5,
        jobId: `weight-csv-${operation.id}`,
      }
    );

    this.fastify.log.info(`Weight CSV job queued with ID: ${job.id} for operation: ${operation.id}`);

    return operation;
  }

  async createDisputeActionsBulk(csvPath: string, userId: string) {
    const operation = await this.fastify.prisma.bulkOperation.create({
      data: {
        id: randomUUID(),
        type: 'DISPUTE_ACTIONS_CSV',
        status: 'PENDING',
        code: this.generateOperationCode(),
        user_id: userId,
        total_count: 0,
      },
    });

    await addJob(QueueNames.BULK_OPERATION, JobType.PROCESS_DISPUTE_ACTIONS_CSV, { csvPath, operationId: operation.id }, { priority: 1 });

    return operation;
  }
}
