import { FastifyRequest, FastifyReply } from 'fastify';
import { BulkOperationsService } from '../services/bulk-operations-service';
import fs from 'fs-extra';
import { promisify } from 'util';
import stream from 'stream';
const pipeline = promisify(stream.pipeline);
import { randomUUID } from 'crypto';
import path from 'path';
import { addJob, Job, QueueNames } from '@/lib/queue';
import { BulkOrderJobType } from '@/modules/orders/queues/bulk-order-worker';

/**
 * Controller for bulk operations API endpoints
 */
export class BulkOperationsController {
  constructor(private bulkOperationsService: BulkOperationsService) {}

  /**
   * Get all bulk operations with pagination and filters
   */
  async getAllBulkOperations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const {
        page = 1,
        pageSize = 10,
        type,
        status,
        startDate,
        endDate,
      } = request.query as {
        page?: number;
        pageSize?: number;
        type?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
      };

      // Parse date range if provided
      let dateRange: [Date, Date] | undefined;
      if (startDate && endDate) {
        dateRange = [new Date(startDate), new Date(endDate)];
      }

      const userId = request.userPayload!.i;

      const operations = await this.bulkOperationsService.getAllBulkOperations(
        userId,
        Number(page),
        Number(pageSize),
        type,
        status,
        dateRange
      );

      return reply.code(200).send(operations);
    } catch (error: any) {
      request.log.error(`Error getting bulk operations: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get bulk operations',
        error: error.message,
      });
    }
  }

  /**
   * Get a single bulk operation by ID
   */
  async getBulkOperation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userPayload!.id;

      const operation = await this.bulkOperationsService.getBulkOperation(id, userId);

      const progress =
        operation.total_count > 0
          ? Math.floor((operation.processed_count / operation.total_count) * 100)
          : 0;

      return reply.code(200).send({
        success: true,
        data: operation,
        progress: progress,
        createdAt: operation.created_at,
        reportPath: operation.report_path,
        errorMessage: operation.error_message,
      });
    } catch (error: any) {
      request.log.error(`Error getting bulk operation: ${error.message}`);
      return reply.code(error.message.includes('not found') ? 404 : 500).send({
        success: false,
        message: 'Failed to get bulk operation',
        error: error.message,
      });
    }
  }

  /**
   * Download a bulk operation report (CSV)
   */
  async downloadReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userPayload!.id;

      const { filePath, fileName } = await this.bulkOperationsService.downloadReport(id, userId);

      // Set headers for file download
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      reply.header('Content-Type', 'text/csv');

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      return reply.send(fileStream);
    } catch (error: any) {
      request.log.error(`Error downloading report: ${error.message}`);
      return reply.code(error.message.includes('not found') ? 404 : 500).send({
        success: false,
        message: 'Failed to download report',
        error: error.message,
      });
    }
  }

  /**
   * Download a bulk operation file (PDF)
   */
  async downloadFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { type } = request.query as { type: string };
      const user_id = request.userPayload!.id;

      // Verify operation exists and belongs to user
      const operation = await request.server.prisma.bulkOperation.findFirst({
        where: {
          id,
          user_id,
        },
      });

      if (!operation) {
        return reply.code(404).send({ error: 'Bulk operation not found' });
      }

      let filePath = '';
      let fileName = '';
      let contentType = '';

      if (type === 'report') {
        // Download CSV report
        if (!operation.report_path) {
          return reply.code(404).send({ error: 'Report not found for this operation' });
        }
        filePath = operation.report_path;
        fileName = `bulk_operation_${operation.code}.csv`;
        contentType = 'text/csv';
      } else if (type === 'file') {
        // Download generated file (e.g., PDF labels)
        if (!operation.file_path) {
          return reply.code(404).send({ error: 'No file available for this operation' });
        }
        filePath = operation.file_path;
        fileName = `bulk_operation_${operation.code}.pdf`;
        contentType = 'application/pdf';
      } else {
        return reply.code(400).send({ error: 'Invalid file type requested' });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'File not found' });
      }

      // Stream the file to the client
      const stream = fs.createReadStream(filePath);

      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      reply.type(contentType);

      return reply.send(stream);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Create bulk shipments
   */
  async createBulkShipments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Support the original request payload format
      const body = request.body as {
        order_ids?: string[];
        courier_ids?: string[];
        is_schedule_pickup?: boolean;
        pickup_date?: string;
        filters?: {
          status?: string;
          dateRange?: [string, string];
        };
      };

      // Process date range if provided
      let dateRange: [Date, Date] | undefined;
      if (body.filters?.dateRange) {
        dateRange = [new Date(body.filters.dateRange[0]), new Date(body.filters.dateRange[1])];
      }

      const result = await this.bulkOperationsService.createBulkShipments(
        {
          order_ids: body.order_ids || [],
          courier_ids: body.courier_ids || [],
          is_schedule_pickup: body.is_schedule_pickup || false,
          pickup_date: body.pickup_date,
          filters: {
            status: body.filters?.status,
            dateRange,
          },
        },
        userId
      );

      return reply.code(202).send({
        success: true,
        message: 'Bulk shipment creation started',
        operationId: result.operationId,
        operation: result.operation,
      });
    } catch (error: any) {
      request.log.error(`Error creating bulk shipments: ${error.message}`);
      return reply.code(400).send({
        success: false,
        message: 'Failed to create bulk shipments',
        error: error.message,
      });
    }
  }

  /**
   * Schedule bulk pickups
   */
  async scheduleBulkPickups(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const data = request.body as { shipment_ids: any[], pickup_date: string };

      const result = await this.bulkOperationsService.scheduleBulkPickups(data, userId);

      return reply.code(202).send({
        success: true,
        message: 'Bulk pickup scheduling started',
        data: result.operation,
      });
    } catch (error: any) {
      request.log.error(`Error scheduling bulk pickups: ${error.message}`);
      return reply.code(400).send({
        success: false,
        message: 'Failed to schedule bulk pickups',
        error: error.message,
      });
    }
  }

  /**
   * Cancel bulk shipments
   */
  async cancelBulkShipments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const data = request.body as { shipment_ids: any[], reason: string };

      const result = await this.bulkOperationsService.cancelBulkShipments(data, userId);

      return reply.code(202).send({
        success: true,
        message: 'Bulk shipment cancellation started',
        data: result.operation,
      });
    } catch (error: any) {
      request.log.error(`Error cancelling bulk shipments: ${error.message}`);
      return reply.code(400).send({
        success: false,
        message: 'Failed to cancel bulk shipments',
        error: error.message,
      });
    }
  }

  /**
   * Generate bulk labels
   */
  async generateBulkLabels(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const data = request.body as { shipments: any[] };

      const result = await this.bulkOperationsService.generateBulkLabels(data, userId);

      return reply.code(202).send({
        success: true,
        message: 'Bulk label generation started',
        data: result.operation,
      });
    } catch (error: any) {
      request.log.error(`Error generating bulk labels: ${error.message}`);
      return reply.code(400).send({
        success: false,
        message: 'Failed to generate bulk labels',
        error: error.message,
      });
    }
  }

  /**
   * Edit bulk pickup addresses
   */
  async editBulkPickupAddresses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const data = request.body as { shipments: any[] };

      const result = await this.bulkOperationsService.editBulkPickupAddresses(data, userId);

      return reply.code(202).send({
        success: true,
        message: 'Bulk pickup address update started',
        data: result.operation,
      });
    } catch (error: any) {
      request.log.error(`Error editing bulk pickup addresses: ${error.message}`);
      return reply.code(400).send({
        success: false,
        message: 'Failed to edit bulk pickup addresses',
        error: error.message,
      });
    }
  }

  /**
   * Bulk upload orders
   */
  async bulkUploadOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const userName = request.userPayload!.name || 'Unknown';

      // Parse multipart form data
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          status: 'error',
          message: 'No file uploaded',
        });
      }

      // Validate file type
      if (!data.mimetype.includes('csv')) {
        return reply.status(400).send({
          status: 'error',
          message: 'Only CSV files are allowed',
        });
      }

      // Create temporary directory if not exists
      const tmpDir = path.join(process.cwd(), 'tmp');
      await fs.ensureDir(tmpDir);

      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = randomUUID().split('-')[0];
      const fileName = `${timestamp}-${uniqueId}-${data.filename}`;
      const filePath = path.join(tmpDir, fileName);

      // Save file
      const writeStream = fs.createWriteStream(filePath);
      await new Promise<void>((res, rej) => {
        (data.file as any)
          .pipe(writeStream)
          .on('finish', () => res())
          .on('error', rej);
      });

      // Create bulk operation record
      const operationCode = `BO-${timestamp}-${uniqueId}`;
      const bulkOperation = await request.server.prisma.bulkOperation.create({
        data: {
          code: operationCode,
          type: 'ORDER_UPLOAD',
          status: 'PENDING',
          user_id: userId,
          total_count: 0,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          file_path: filePath,
        },
      });

      // Parse header mapping if provided as form field
      let headerMapping: Record<string, string> = {};
      const mappingField = (data as any).fields?.mapping;
      if (mappingField) {
        try {
          const raw = Buffer.isBuffer(mappingField.value)
            ? mappingField.value.toString()
            : mappingField.value;
          headerMapping = JSON.parse(raw);
        } catch (err) {
          request.log.warn('Invalid mapping JSON provided, proceeding with empty mapping');
        }
      }

      // Enqueue job for processing
      const job = (await addJob(
        QueueNames.BULK_ORDER_UPLOAD,
        BulkOrderJobType.PROCESS_BULK_ORDERS,
        {
          filePath,
          originalFilename: data.filename,
          userId,
          userName,
          operationId: bulkOperation.id,
          headerMapping,
        },
        {
          priority: 1,
          attempts: 3,
        }
      )) as Job<unknown, unknown, string>;

      const jobIdStr = (job as any).id as string;

      return {
        status: 'queued',
        jobId: jobIdStr,
        operationId: bulkOperation.id,
        filePath,
        message: 'CSV file queued for processing',
      };
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Failed to upload CSV',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async uploadWeightCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.isMultipart()) {
        return reply.code(400).send({ error: 'Multipart file expected' });
      }

      const userId = request.userPayload!.id;
      const filePart = await (request as any).file();
      
      if (!filePart) {
        return reply.code(400).send({ error: 'CSV file missing' });
      }
      
      request.log.info(`Received CSV file: ${filePart.filename}`);
      
      // Create temporary directory if it doesn't exist
      const tempDir = '/tmp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, `${Date.now()}-${filePart.filename}`);
      request.log.info(`Saving file to: ${tempPath}`);
      
      // Save the file
      await pipeline(filePart.file, fs.createWriteStream(tempPath));
      
      // Verify file exists and has content
      if (!fs.existsSync(tempPath)) {
        return reply.code(500).send({ error: 'Failed to save CSV file' });
      }
      
      const stats = fs.statSync(tempPath);
      request.log.info(`File saved. Size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        return reply.code(400).send({ error: 'CSV file is empty' });
      }
      
      // Read the first few lines for debugging
      const fileContent = fs.readFileSync(tempPath, 'utf8').slice(0, 500);
      request.log.info(`File content sample: ${fileContent}`);
      
      const operation = await this.bulkOperationsService.createWeightChargeBulk(tempPath, userId);
      
      return reply.code(201).send({ 
        success: true, 
        operationId: operation.id,
        message: 'Weight CSV uploaded successfully and queued for processing'
      });
    } catch (error) {
      request.log.error(`Error uploading weight CSV: ${error}`);
      return reply.code(500).send({ 
        error: 'Failed to process weight CSV',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async uploadDisputeActionsCsv(request: FastifyRequest, reply: FastifyReply) {
    if (!request.isMultipart()) {
      return reply.code(400).send({ error: 'Multipart file expected' });
    }

    const userId = request.userPayload!.id;
    const filePart = await (request as any).file();
    if (!filePart) return reply.code(400).send({ error: 'CSV file missing' });
    const tempPath = path.join('/tmp', `${Date.now()}-${filePart.filename}`);
    await pipeline(filePart.file, fs.createWriteStream(tempPath));
    const operation = await this.bulkOperationsService.createDisputeActionsBulk(tempPath, userId);
    return reply.code(201).send({ success: true, operationId: operation.id });
  }
}
