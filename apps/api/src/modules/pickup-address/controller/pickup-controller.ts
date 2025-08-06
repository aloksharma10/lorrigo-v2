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
   * Get all hubs for authenticated seller with advanced filtering
   * @param request Request object
   * @param reply Response object
   * @returns Response with hubs
   */
  async getHubs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const queryParams = request.query as {
        page?: string;
        limit?: string;
        search?: string;
        is_active?: string;
        is_primary?: string;
        globalFilter?: string;
        sorting?: string;
      };

      // Parse comma-separated filter values
      const parseCommaSeparatedValues = (value: string | undefined): string[] => {
        if (!value) return [];
        return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      };

      // Extract filter values
      const isActiveValues = parseCommaSeparatedValues(queryParams.is_active);
      const isPrimaryValues = parseCommaSeparatedValues(queryParams.is_primary);

      // Determine sortBy and sortOrder from sorting array
      let sortBy = 'name';
      let sortOrder: 'asc' | 'desc' = 'asc';
      
      if (queryParams.sorting) {
        try {
          const sorting = JSON.parse(queryParams.sorting);
          if (sorting.length > 0 && sorting[0]) {
            sortBy = sorting[0].id;
            sortOrder = sorting[0].desc ? 'desc' : 'asc';
          }
        } catch (e) {
          // Ignore parsing errors, use defaults
        }
      }

      const parsedParams = {
        page: queryParams.page ? parseInt(queryParams.page) : 1,
        limit: queryParams.limit ? parseInt(queryParams.limit) : 15,
        search: queryParams.globalFilter || queryParams.search,
        is_active: isActiveValues.length > 0 ? isActiveValues : undefined,
        is_primary: isPrimaryValues.length > 0 ? isPrimaryValues : undefined,
        sortBy,
        sortOrder,
      };

      const result = await this.pickupService.getAllHubs(userId, parsedParams);
      return reply.send(result);
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

  /**
   * Update hub status (active/inactive)
   * @param request Request object
   * @param reply Response object
   * @returns Response with update result
   */
  async updateHubStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { is_active } = request.body as { is_active: boolean };
      const userId = request.userPayload!.id;

      const result = await this.pickupService.updateHubStatus(id, is_active, userId);
      
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Error in updateHubStatus controller:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to update hub status',
        error: error.message || error,
      });
    }
  }

  /**
   * Set hub as primary
   * @param request Request object
   * @param reply Response object
   * @returns Response with update result
   */
  async setPrimaryHub(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userPayload!.id;

      const result = await this.pickupService.setPrimaryHub(id, userId);
      
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Error in setPrimaryHub controller:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to set primary hub',
        error: error.message || error,
      });
    }
  }
}
