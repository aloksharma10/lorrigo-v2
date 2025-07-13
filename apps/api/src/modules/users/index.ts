import { FastifyInstance } from 'fastify';
import { UsersController } from './controllers/users-controller';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

export async function usersRoutes(fastify: FastifyInstance) {
  // Ensure user is authenticated for all routes
  fastify.addHook('onRequest', fastify.authenticate);

  // Initialize controller
  const usersController = new UsersController(fastify);

  // Get users with pagination
  fastify.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'Get all users with pagination',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'SELLER'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  wallet_balance: { type: 'number' },
                  plan: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  profile: {
                    type: 'object',
                    properties: {
                      company_name: { type: 'string' },
                      phone: { type: 'string' },
                      address: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      pincode: { type: 'string' },
                    },
                  },
                  _count: {
                    type: 'object',
                    properties: {
                      orders: { type: 'integer' },
                      shipments: { type: 'integer' },
                      invoice_transactions: { type: 'integer' },
                      weight_disputes: { type: 'integer' },
                      shipment_transactions: { type: 'integer' },
                      wallet_recharge_transactions: { type: 'integer' },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.getUsersWithPagination(request, reply),
  });

  // Get user by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Get user by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
                wallet_balance: { type: 'number' },
              },
            },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.getUserById(request, reply),
  });

  // Update user
  fastify.put('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Update user',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          company_name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          pincode: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.updateUser(request, reply),
  });
} 