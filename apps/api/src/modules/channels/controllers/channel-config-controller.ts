import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { captureException } from '@/lib/sentry';
import { ChannelConfigService } from '../services/channel-config-service';

// Validation schemas
const createChannelConfigSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(10, 'Nickname must not exceed 10 characters')
    .regex(/^[A-Z]+$/, 'Nickname must contain only uppercase letters'),
  is_active: z.boolean().optional().default(true),
});

const updateChannelConfigSchema = createChannelConfigSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
});

export class ChannelConfigController {
  constructor(private channelConfigService: ChannelConfigService) {}

  /**
   * Get all channel configurations with pagination and filtering
   */
  async getAllChannelConfigs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = querySchema.parse(request.query);
      const { page, limit, search, is_active } = query;

      const result = await this.channelConfigService.getAllChannelConfigs(page, limit, search, is_active);

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Invalid query parameters',
          errors: error.errors,
        });
      }
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Get a single channel configuration by ID
   */
  async getChannelConfigById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id || typeof id !== 'string') {
        return reply.code(400).send({ message: 'Invalid channel configuration ID' });
      }

      const channelConfig = await this.channelConfigService.getChannelConfigById(id);

      if ('error' in channelConfig) {
        return reply.code(channelConfig.status).send({ message: channelConfig.error });
      }

      return channelConfig;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Get a channel configuration by name or nickname
   */
  async getChannelConfigByIdentifier(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { identifier } = request.params as { identifier: string };

      if (!identifier || typeof identifier !== 'string') {
        return reply.code(400).send({ message: 'Invalid identifier' });
      }

      const channelConfig = await this.channelConfigService.getChannelConfigByIdentifier(identifier);

      if ('error' in channelConfig) {
        return reply.code(channelConfig.status).send({ message: channelConfig.error });
      }

      return channelConfig;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Create a new channel configuration
   */
  async createChannelConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createChannelConfigSchema.parse(request.body);
      const channelConfig = await this.channelConfigService.createChannelConfig(data);

      if ('error' in channelConfig) {
        return reply.code(channelConfig.status).send({ message: channelConfig.error });
      }

      return reply.code(201).send(channelConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Update a channel configuration
   */
  async updateChannelConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id || typeof id !== 'string') {
        return reply.code(400).send({ message: 'Invalid channel configuration ID' });
      }

      const data = updateChannelConfigSchema.parse(request.body);

      // Check if there's anything to update
      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: 'No fields provided for update' });
      }

      const channelConfig = await this.channelConfigService.updateChannelConfig(id, data);

      if ('error' in channelConfig) {
        return reply.code(channelConfig.status).send({ message: channelConfig.error });
      }

      return channelConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Delete a channel configuration
   */
  async deleteChannelConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id || typeof id !== 'string') {
        return reply.code(400).send({ message: 'Invalid channel configuration ID' });
      }

      const result = await this.channelConfigService.deleteChannelConfig(id);

      if ('error' in result) {
        return reply.code(result.status).send({ message: result.error });
      }

      return result;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Toggle the active status of a channel configuration
   */
  async toggleChannelConfigStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id || typeof id !== 'string') {
        return reply.code(400).send({ message: 'Invalid channel configuration ID' });
      }

      const channelConfig = await this.channelConfigService.toggleChannelConfigStatus(id);

      if ('error' in channelConfig) {
        return reply.code(channelConfig.status).send({ message: channelConfig.error });
      }

      return channelConfig;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Get active channel configurations (for dropdowns/selection)
   */
  async getActiveChannelConfigs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const channelConfigs = await this.channelConfigService.getActiveChannelConfigs();
      return channelConfigs;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
