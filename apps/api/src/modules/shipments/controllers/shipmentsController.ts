import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShipmentService } from '../services/shipmentService';
import { CreateShipmentSchema, UpdateShipmentSchema, AddTrackingEventSchema } from '@lorrigo/utils';
import { checkAuth } from '@/middleware/auth';
import { captureException } from '@/lib/sentry';
import { ShipmentStatus } from '@lorrigo/db';
import fs from 'fs';
import { processShipmentTracking } from '../batch/processor';

/**
 * Controller for shipment-related API endpoints
 */
export class ShipmentController {
  constructor(private shipmentService: ShipmentService) { }
  /**
   * Get rates for an order
   */
  async getRates(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    try {
      const { orderId } = request.params;
      const user_id = request.userPayload!.id;

      const rates = await this.shipmentService.getShipmentRates(orderId, user_id);

      return rates;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  /**
   * Create a new shipment
   */
  async createShipment(request: FastifyRequest, reply: FastifyReply) {
    const { id: userId } = request.userPayload as { id: string };
    try {
      
      const data = request.body as z.infer<typeof CreateShipmentSchema>;
      // Validate data
      try {
        CreateShipmentSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        return reply.code(400).send({ error: 'Invalid request data' });
      }

      const result = await this.shipmentService.createShipment(data, userId);

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.code(201).send(result);
    } catch (error) {
      console.log(error, "error")
      captureException(error as Error, {
        userId: userId,
        data: request.body,
        error: error,
      });
      return reply.code(500).send({ error: 'Failed to create shipment' });
    }
  }

  /**
   * Get all shipments for a user
   */
  async getAllShipments(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);

      const user_id = request.userPayload!.id;

      const shipments = await this.shipmentService.getAllShipments(user_id);

      return reply.send(shipments);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get a specific shipment by ID
   */
  async getShipmentById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);

      const { id } = request.params;
      const user_id = request.userPayload!.id;

      const shipment = await this.shipmentService.getShipmentById(id, user_id);

      if (!shipment) {
        return reply.code(404).send({ error: 'Shipment not found' });
      }

      return reply.send(shipment);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get tracking events for a shipment
   */
  async getTrackingEvents(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);

      const { id } = request.params;
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.getTrackingEvents(id, user_id);

      if (result.error) {
        return reply.code(404).send({ error: result.error });
      }

      return reply.send(result.tracking_events);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Cancel a shipment
   */
  async cancelShipment(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const { reason, cancelType } = request.body as {
        reason?: string;
        cancelType: 'shipment' | 'order';
      };
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.cancelShipment(id, cancelType, user_id, reason);

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Schedule pickup for a shipment
   */
  async schedulePickup(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);

      const { id } = request.params;
      const { pickupDate } = request.body as { pickupDate: string };
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.schedulePickup(id, user_id, pickupDate);

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get shipment statistics
   */
  async getShipmentStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);

      const user_id = request.userPayload!.id;

      const stats = await this.shipmentService.getShipmentStats(user_id);

      return reply.send(stats);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Create multiple shipments in bulk
   */
  async createShipmentBulk(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: userId } = request.userPayload as { id: string };
      const body = request.body as {
        order_ids?: string[];
        courier_ids?: string[];
        is_schedule_pickup?: boolean;
        filters?: {
          status?: string;
          dateRange?: [string, string];
        };
        pickup_date?: string;
      };

      // Process date range if provided
      let dateRange: [Date, Date] | undefined;
      if (body.filters?.dateRange) {
        dateRange = [new Date(body.filters.dateRange[0]), new Date(body.filters.dateRange[1])];
      }

      const result = await this.shipmentService.createShipmentBulk(
        {
          order_ids: body.order_ids || [],
          courier_ids: body.courier_ids || [],
          is_schedule_pickup: body.is_schedule_pickup || false,
          pickup_date: body.pickup_date,
          status: body.filters?.status,
          dateRange,
        },
        userId
      );

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.code(202).send(result);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create bulk shipments' });
    }
  }

  /**
   * Schedule pickup in bulk
   */
  async schedulePickupBulk(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user_id = request.userPayload!.id;
      const { shipment_ids, pickup_date, filters } = request.body as {
        shipment_ids?: string[];
        pickup_date: string;
        filters?: {
          status?: string;
          dateRange?: [string, string];
        };
      };

      // Convert date strings to Date objects if provided
      const processedFilters = filters
        ? {
          ...filters,
          status: filters.status as ShipmentStatus,
          dateRange: filters.dateRange
            ? ([new Date(filters.dateRange[0]), new Date(filters.dateRange[1])] as [Date, Date])
            : undefined,
        }
        : undefined;

      const result = await this.shipmentService.schedulePickupBulk(
        shipment_ids || [],
        pickup_date,
        user_id,
        processedFilters
      );

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.code(202).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Cancel shipment in bulk
   */
  async cancelShipmentBulk(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user_id = request.userPayload!.id;
      const { shipment_ids, reason, filters } = request.body as {
        shipment_ids?: string[];
        reason: string;
        filters?: {
          status?: string;
          dateRange?: [string, string];
        };
      };

      // Convert date strings to Date objects if provided
      const processedFilters = filters
        ? {
          ...filters,
          status: filters.status as ShipmentStatus,
          dateRange: filters.dateRange
            ? ([new Date(filters.dateRange[0]), new Date(filters.dateRange[1])] as [Date, Date])
            : undefined,
        }
        : undefined;

      const result = await this.shipmentService.cancelShipmentBulk(
        shipment_ids || [],
        reason,
        user_id,
        processedFilters
      );

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.code(202).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.getBulkOperationStatus(id, user_id);

      if (result.error) {
        return reply.code(404).send({ error: result.error });
      }

      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Download bulk operation report or file
   */
  async downloadBulkOperationFile(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { type: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { type = 'report' } = request.query;
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
   * Process a batch of shipments for tracking updates
   * This endpoint is called by the worker service
   */
  async trackShipmentBatch(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { batchSize } = request.body as { batchSize?: number };

      const result = await processShipmentTracking(
        request.server,
        this.shipmentService,
        { batchSize: batchSize || 50 }
      );

      return reply.send({
        success: true,
        message: `Processed ${result.processed} shipments: ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`,
        ...result
      });
    } catch (error) {
      request.log.error('Error in trackShipmentBatch:', error);
      captureException(error as Error);

      return reply.code(500).send({
        success: false,
        message: 'Failed to process shipment tracking batch',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track a specific shipment by ID
   */
  async trackShipment(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // // Check if user is authenticated
      // await checkAuth(request, reply);

      const { id } = request.params;
      const user_id = request.userPayload!.id;

      // Get shipment details
      const shipment = await this.shipmentService.getShipmentById(id, user_id);

      if (!shipment) {
        return reply.code(404).send({ error: 'Shipment not found' });
      }

      if (!shipment.awb) {
        return reply.code(400).send({ error: 'Shipment has no AWB number for tracking' });
      }

      if (!shipment.courier || !shipment.courier.channel_config) {
        return reply.code(400).send({ error: 'Shipment has no courier information' });
      }

      // Track the shipment
      const trackingResult = await this.shipmentService.trackShipment(
        id,
        shipment.courier.channel_config.name,
        shipment.awb,
        shipment.order_id
      );

      if (!trackingResult.success) {
        return reply.code(400).send({
          error: trackingResult.message || 'Failed to track shipment',
          status: shipment.status
        });
      }

      // Get updated shipment details to include EDD
      const updatedShipment = await this.shipmentService.getShipmentById(id, user_id);

      return reply.send({
        success: true,
        message: trackingResult.updated
          ? `Shipment status updated to ${trackingResult.newStatus}`
          : 'No status change detected',
        status: trackingResult.newStatus || shipment.status,
        bucket: trackingResult.newBucket || shipment.bucket,
        tracking_events: trackingResult.events || [],
        edd: updatedShipment?.edd || null
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Handle NDR (Non-Delivery Report) event
   * @param request Request object
   * @param reply Response object
   * @returns Response with NDR creation result
   */
  async handleNDREvent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;
      const userId = request.userPayload?.id;

      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Validate required fields
      if (!body.shipment_id || !body.order_id) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: shipment_id and order_id are required',
        });
      }

      // Create NDR record using service
      const result = await this.shipmentService.createNDRRecord(body, userId);

      return reply.code(result.success ? 200 : 400).send(result);
    } catch (error: any) {
      request.log.error(`Error handling NDR event: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * Get NDR orders for a user
   * @param request Request object
   * @param reply Response object
   * @returns Response with NDR orders
   */
  async getNDROrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload?.id;
      const query = request.query as any;

      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Get pagination parameters
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '10', 10);
      const status = query.status;
      const awb = query.awb;
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      const actionTaken = query.actionTaken === 'true';

      // Get NDR orders using service
      const result = await this.shipmentService.getNDROrders(
        userId,
        page,
        limit,
        status,
        awb,
        startDate,
        endDate,
        query.actionTaken !== undefined ? actionTaken : undefined
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      request.log.error(`Error getting NDR orders: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * Take action on an NDR order
   * @param request Request object
   * @param reply Response object
   * @returns Response with action result
   */
  async takeNDRAction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;
      const userId = request.userPayload?.id;
      const params = request.params as any;

      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Validate required fields
      if (!params.id || !body.action_type) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: id and action_type are required',
        });
      }

      // Valid action types
      const validActionTypes = ['reattempt', 'return', 'cancel'];
      if (!validActionTypes.includes(body.action_type)) {
        return reply.code(400).send({
          success: false,
          message: `Invalid action_type. Must be one of: ${validActionTypes.join(', ')}`,
        });
      }

      // Take action on NDR order using service
      const result = await this.shipmentService.takeNDRAction(
        params.id,
        body.action_type,
        body.comment || '',
        userId
      );

      return reply.code(result.success ? 200 : 400).send(result);
    } catch (error: any) {
      request.log.error(`Error taking NDR action: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
} 