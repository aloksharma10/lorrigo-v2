import { FastifyInstance } from 'fastify';
import { PasskeyController } from './controller/passkey-controller';
import { PrismaClient } from '@lorrigo/db';

export default async function passkeyRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;
  const passkeyController = new PasskeyController(prisma);

  // Generate registration options
  fastify.post('/register/:userId/options', {
  
    handler: (request, reply) => passkeyController.generateRegistrationOptions(request, reply),
  });

  // Verify registration
  fastify.post('/register/:userId/verify', {
    schema: {
      tags: ['Passkey'],
      summary: 'Verify passkey registration',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      body: {
        type: 'object',
        properties: {
          credential: { type: 'object' },
          expectedChallenge: { type: 'string' },
        },
        required: ['credential', 'expectedChallenge'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => passkeyController.verifyRegistration(request, reply),
  });

  // Generate authentication options
  fastify.post('/authenticate/options', {
    handler: (request, reply) => passkeyController.generateAuthenticationOptions(request, reply),
  });

  // Verify authentication
  fastify.post('/authenticate/verify', {
    schema: {
      tags: ['Passkey'],
      summary: 'Verify passkey authentication',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          credential: { type: 'object' },
        },
        required: ['email', 'credential'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                hasPasskeys: { type: 'boolean' },
              },
            },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => passkeyController.verifyAuthentication(request, reply),
  });

  // Get user's passkeys
  fastify.get('/:userId', {
    schema: {
      tags: ['Passkey'],
      summary: 'Get user\'s passkeys',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            passkeys: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  deviceType: { type: 'string' },
                  createdAt: { type: 'string' },
                  lastUsedAt: { type: 'string' },
                  transports: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => passkeyController.getUserPasskeys(request, reply),
  });

  // Delete a passkey
  fastify.delete('/:userId/:passkeyId', {
    schema: {
      tags: ['Passkey'],
      summary: 'Delete a passkey',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          passkeyId: { type: 'string' },
        },
        required: ['userId', 'passkeyId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => passkeyController.deletePasskey(request, reply),
  });
} 