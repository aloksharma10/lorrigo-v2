import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShipmentService } from '../services/shipmentService';
import { CreateShipmentSchema, UpdateShipmentSchema, AddTrackingEventSchema } from '../validations';
import { checkAuth } from '../../../middleware/auth';

/**
 * Controller for shipment-related API endpoints
 */
export class ShipmentController {
  private shipmentService: ShipmentService;

  constructor() {
    this.shipmentService = new ShipmentService();
  }

  /**
   * Create a new shipment
   */
  async createShipment(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const data = CreateShipmentSchema.parse(request.body);
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.createShipment(data, user_id);

      if (result.error) {
        return reply.code(404).send({ error: result.error });
      }

      return reply.code(201).send(result.shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
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
   * Update a shipment
   */
  async updateShipment(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { id } = request.params;
      const updateData = UpdateShipmentSchema.parse(request.body);
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.updateShipment(id, user_id, updateData);

      if (result.error) {
        return reply.code(404).send({ error: result.error });
      }

      return reply.send(result.shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Add a tracking event to a shipment
   */
  async addTrackingEvent(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { id } = request.params;
      const eventData = AddTrackingEventSchema.parse(request.body);
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.addTrackingEvent(id, user_id, eventData);

      if (result.error) {
        return reply.code(404).send({ error: result.error });
      }

      return reply.code(201).send(result.tracking_event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
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
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { id } = request.params;
      const user_id = request.userPayload!.id;

      const result = await this.shipmentService.cancelShipment(id, user_id);

      if (result.error) {
        return reply.code(400).send({ error: result.error });
      }

      return reply.send(result.shipment);
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
}
