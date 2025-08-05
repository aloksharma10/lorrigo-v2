import { FastifyRequest, FastifyReply } from 'fastify';
import { PickupService } from '../services/pickup-service';
import { pickupAddressRegistrationSchema } from '@lorrigo/utils';

/**
 * Controller for pickup address operations
 */
export class PickupController {
  constructor(private pickupService: PickupService) {}
  /**
   * Create a new hub
   * @param request Request object
   * @param reply Response object
   * @returns Response with creation result
   */
  async createHub(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;

      // Validate request payload
      const validationResult = pickupAddressRegistrationSchema.safeParse(body);
      if (!validationResult.success) {
        return reply.code(400).send(validationResult.error);
      }

      // Create hub using service
      const result = await this.pickupService.createPickup(body, request.userPayload!.id, request.userPayload!.name);

      // Return result with appropriate status code
      if (!result.valid) {
        const statusCode = result.message?.includes('already exists') ? 200 : 500;
        return reply.code(statusCode).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Error in createHub controller:', error);
      return reply.code(500).send({
        valid: false,
        message: 'Internal server error',
        error: error.message || error,
      });
    }
  }

  /**
   * Get all hubs for authenticated seller
   * @param request Request object
   * @param reply Response object
   * @returns Response with hubs
   */
  async getHubs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const hubs = await this.pickupService.getHubs(request.userPayload!.id);
      return reply.code(200).send({ hubs });
    } catch (error: any) {
      console.error('Error in getHubs controller:', error);
      return reply.code(500).send({
        message: 'Failed to fetch hubs',
        error: error.message || error,
      });
    }
  }

  /**
   * Get hub by ID
   * @param request Request object
   * @param reply Response object
   * @returns Response with hub
   */
  async getHubById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const hubId = request.params as { id: string };
      const hub = await this.pickupService.getHubById(hubId.id, request.userPayload!.id);

      if (!hub) {
        return reply.code(404).send({
          message: 'Hub not found',
        });
      }

      return reply.code(200).send({ hub });
    } catch (error: any) {
      console.error('Error in getHubById controller:', error);
      return reply.code(500).send({
        message: 'Failed to fetch hub',
        error: error.message || error,
      });
    }
  }
}
