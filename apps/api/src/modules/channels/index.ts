import { FastifyInstance } from 'fastify';
import { ChannelConfigController } from './controllers/channel-config-controller';
import { ChannelConfigService } from './services/channel-config-service';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { ShopifyController } from './controllers/shopify-controller';

/**
 * Channel Configuration module routes
 */
export default async function channelRoutes(fastify: FastifyInstance): Promise<void> {
  // Initialize services and controllers
  const channelConfigService = new ChannelConfigService();
  const channelConfigController = new ChannelConfigController(channelConfigService);
  const shopifyController = new ShopifyController(fastify);

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Register Shopify routes
  shopifyController.registerRoutes(fastify);

  // Get all channel configurations with pagination and filtering
  fastify.get('/', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Get all channel configurations',
      description: 'Retrieve all channel configurations with pagination, search, and filtering options',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number for pagination',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Number of items per page',
          },
          search: {
            type: 'string',
            description: 'Search term to filter by name or nickname',
          },
          is_active: {
            type: 'boolean',
            description: 'Filter by active status',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            channelConfigs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  nickname: { type: 'string' },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  couriers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        is_active: { type: 'boolean' },
                      },
                    },
                  },
                  _count: {
                    type: 'object',
                    properties: {
                      couriers: { type: 'integer' },
                    },
                  },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.getAllChannelConfigs(request, reply),
  });

  // Get active channel configurations (for dropdowns/selection)
  fastify.get('/active', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN, Role.SELLER])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Get active channel configurations',
      description: 'Retrieve only active channel configurations for dropdowns/selection',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              nickname: { type: 'string' },
              _count: {
                type: 'object',
                properties: {
                  couriers: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.getActiveChannelConfigs(request, reply),
  });

  // Get a single channel configuration by ID
  fastify.get('/:id', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Get channel configuration by ID',
      description: 'Retrieve a specific channel configuration with its associated couriers',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Channel configuration ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nickname: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            couriers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  name: { type: 'string' },
                  courier_code: { type: 'string' },
                  is_active: { type: 'boolean' },
                  type: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
            _count: {
              type: 'object',
              properties: {
                couriers: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.getChannelConfigById(request, reply),
  });

  // Get channel configuration by name or nickname
  fastify.get('/lookup/:identifier', {
    preHandler: [authorizeRoles([Role.ADMIN, Role.SUBADMIN, Role.SELLER])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Get channel configuration by name or nickname',
      description: 'Retrieve channel configuration using name or nickname',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['identifier'],
        properties: {
          identifier: {
            type: 'string',
            description: 'Channel configuration name or nickname',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nickname: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            couriers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  name: { type: 'string' },
                  courier_code: { type: 'string' },
                  type: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.getChannelConfigByIdentifier(request, reply),
  });

  // Create a new channel configuration
  fastify.post('/', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Create a new channel configuration',
      description: 'Create a new channel configuration with unique name and nickname',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'nickname'],
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            pattern: '^[a-zA-Z\\s]+$',
            description: 'Channel configuration name (letters and spaces only)',
          },
          nickname: {
            type: 'string',
            minLength: 2,
            maxLength: 10,
            pattern: '^[A-Z]+$',
            description: 'Channel configuration nickname (uppercase letters only)',
          },
          is_active: {
            type: 'boolean',
            default: true,
            description: 'Whether the channel configuration is active',
          },
        },
        additionalProperties: false,
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nickname: { type: 'string' },
            is_active: { type: 'boolean' },
            couriers_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.createChannelConfig(request, reply),
  });

  // Update a channel configuration
  fastify.put('/:id', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Update a channel configuration',
      description: 'Update an existing channel configuration',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Channel configuration ID',
          },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            pattern: '^[a-zA-Z\\s]+$',
            description: 'Channel configuration name (letters and spaces only)',
          },
          nickname: {
            type: 'string',
            minLength: 2,
            maxLength: 10,
            pattern: '^[A-Z]+$',
            description: 'Channel configuration nickname (uppercase letters only)',
          },
          is_active: {
            type: 'boolean',
            description: 'Whether the channel configuration is active',
          },
        },
        additionalProperties: false,
        minProperties: 1,
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nickname: { type: 'string' },
            is_active: { type: 'boolean' },
            couriers_count: { type: 'integer' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.updateChannelConfig(request, reply),
  });

  // Toggle channel configuration status
  fastify.patch('/:id/toggle-status', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Toggle channel configuration status',
      description: 'Toggle the active/inactive status of a channel configuration',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Channel configuration ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nickname: { type: 'string' },
            is_active: { type: 'boolean' },
            couriers_count: { type: 'integer' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.toggleChannelConfigStatus(request, reply),
  });

  // Delete a channel configuration
  fastify.delete('/:id', {
    preHandler: [authorizeRoles([Role.ADMIN])],
    schema: {
      tags: ['Channel Configuration'],
      summary: 'Delete a channel configuration',
      description: 'Delete a channel configuration (only if no associated couriers exist)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Channel configuration ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => channelConfigController.deleteChannelConfig(request, reply),
  });
}
