import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShipmentService } from '../services/shipmentService';
import { CreateShipmentSchema, UpdateShipmentSchema, AddTrackingEventSchema } from '@lorrigo/utils';
import { checkAuth } from '@/middleware/auth';
import { captureException } from '@/lib/sentry';
import { ShipmentStatus } from '@lorrigo/db';

/**
 * Controller for shipment-related API endpoints
 */
export class ShipmentController {
  constructor(private shipmentService: ShipmentService) {}
  /**
   * Get rates for an order
   */
  async getRates(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user_id = request.userPayload!.id;

      const rates = await this.shipmentService.getShipmentRates(id, user_id);

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
    try {
      const { id: userId } = request.userPayload as { id: string };
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
        body.order_ids || [],
        body.courier_ids || [],
        body.is_schedule_pickup || false,
        body.pickup_date,
        userId,
        {
          status: body.filters?.status,
          dateRange,
        }
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
}
