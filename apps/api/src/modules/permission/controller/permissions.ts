import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authorizeRoles } from '../../../middleware/auth';
import { PermissionService } from '../services/permissionService';
import { Role } from '@lorrigo/db';

// Define validation schemas
const assignPermissionSchema = z.object({
  userId: z.string().uuid(),
  permissionName: z.string().min(2),
  description: z.string().optional(),
});

const removePermissionSchema = z.object({
  userId: z.string().uuid(),
  permissionName: z.string().min(2),
});

const setNavPermissionsSchema = z.object({
  userId: z.string().uuid(),
  navPermissions: z.record(z.string(), z.boolean()),
});

// Only ADMIN and SUBADMIN can manage permissions
const ADMIN_ROLES = [Role.ADMIN, Role.SUBADMIN];

export default async function permissionRoutes(fastify: FastifyInstance) {
  // Get all permissions for a user
  fastify.get('/user/:userId', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    schema: {
      tags: ['Permissions'],
      summary: 'Get all permissions for a user',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        
        // Check if user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        
        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }
        
        const permissions = await PermissionService.getUserPermissions(userId);
        return reply.send(permissions);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  });
  
  // Assign a permission to a user
  fastify.post('/assign', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    schema: {
      tags: ['Permissions'],
      summary: 'Assign a permission to a user',
      body: {
        type: 'object',
        required: ['userId', 'permissionName'],
        properties: {
          userId: { type: 'string' },
          permissionName: { type: 'string' },
          description: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId, permissionName, description } = assignPermissionSchema.parse(request.body);
        
        // Check if user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        
        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }
        
        const permission = await PermissionService.assignPermission(userId, permissionName, description);
        return reply.send(permission);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  });
  
  // Remove a permission from a user
  fastify.post('/remove', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    schema: {
      tags: ['Permissions'],
      summary: 'Remove a permission from a user',
      body: {
        type: 'object',
        required: ['userId', 'permissionName'],
        properties: {
          userId: { type: 'string' },
          permissionName: { type: 'string' },
        },
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
    handler: async (request, reply) => {
      try {
        const { userId, permissionName } = removePermissionSchema.parse(request.body);
        
        // Check if user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        
        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }
        
        const success = await PermissionService.removePermission(userId, permissionName);
        
        if (success) {
          return reply.send({
            success: true,
            message: `Permission ${permissionName} removed from user`,
          });
        } else {
          return reply.send({
            success: false,
            message: `Permission ${permissionName} not found for user`,
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  });
  
  // Set navigation permissions for a user
  fastify.post('/nav', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    schema: {
      tags: ['Permissions'],
      summary: 'Set navigation permissions for a user',
      body: {
        type: 'object',
        required: ['userId', 'navPermissions'],
        properties: {
          userId: { type: 'string' },
          navPermissions: {
            type: 'object',
            additionalProperties: { type: 'boolean' },
          },
        },
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
    handler: async (request, reply) => {
      try {
        const { userId, navPermissions } = setNavPermissionsSchema.parse(request.body);
        
        // Check if user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        
        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }
        
        await PermissionService.setNavPermissions(userId, navPermissions);
        
        return reply.send({
          success: true,
          message: 'Navigation permissions updated',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  });
  
  // Get navigation permissions for a user
  fastify.get('/nav/:userId', {
    preHandler: [authorizeRoles(ADMIN_ROLES)],
    schema: {
      tags: ['Permissions'],
      summary: 'Get navigation permissions for a user',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        
        // Check if user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        
        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }
        
        const navPermissions = await PermissionService.getNavPermissions(userId);
        
        return reply.send(navPermissions || {});
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  });
} 