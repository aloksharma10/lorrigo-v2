import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@lorrigo/db';

interface Permission {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Middleware for authenticating user
 * Uses the Fastify JWT authentication
 */
export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Use the authenticate decorator from the auth plugin
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
}

/**
 * Middleware for role-based authorization
 * @param roles - Array of allowed roles
 */
export function authorizeRoles(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // First authenticate the user
      await authenticateUser(request, reply);
      
      // Check if user's role is in the allowed roles
      const userRole = request.user.role as Role;
      
      if (!roles.includes(userRole)) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
      }
    } catch (err) {
      // Authentication already handles its own errors
    }
  };
}

/**
 * Middleware for permission-based authorization
 * @param requiredPermissions - Array of permission names required
 */
export function authorizePermissions(requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // First authenticate the user
      await authenticateUser(request, reply);
      
      // Get the user's permissions
      const userPermissions = (request.user.permissions || []) as Permission[];
      
      // If the user is an ADMIN, they have all permissions
      if (request.user.role === 'ADMIN') {
        return;
      }
      
      // Check if the user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.some(p => p.name === permission && p.isActive)
      );
      
      if (!hasAllPermissions) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have the required permissions to access this resource',
        });
      }
    } catch (err) {
      // Authentication already handles its own errors
    }
  };
}

/**
 * Middleware to check if user is the owner of a resource
 * @param resourceIdParam - The parameter name that contains the resource ID
 * @param resourceType - The type of resource (e.g., 'order', 'shipment')
 */
export function authorizeOwner(resourceIdParam: string, resourceType: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // First authenticate the user
      await authenticateUser(request, reply);
      
      // Get the resource ID from the request params
      const resourceId = (request.params as any)[resourceIdParam];
      
      if (!resourceId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `${resourceType} ID is required`,
        });
      }
      
      // If the user is an ADMIN or SUBADMIN, they can access any resource
      if (['ADMIN', 'SUBADMIN'].includes(request.user.role)) {
        return;
      }
      
      // Get the prisma client from the fastify instance
      const prisma = (request as any).server.prisma;
      
      // Check if the resource exists and belongs to the user
      let resource;
      
      switch (resourceType) {
        case 'order':
          resource = await prisma.order.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          break;
        case 'shipment':
          resource = await prisma.shipment.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          break;
        case 'customer':
          resource = await prisma.customer.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          break;
        default:
          return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: `Unsupported resource type: ${resourceType}`,
          });
      }
      
      if (!resource) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`,
        });
      }
      
      if (resource.userId !== request.user.id) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: `You do not have permission to access this ${resourceType}`,
        });
      }
    } catch (err) {
      // Authentication already handles its own errors
      console.error(err);
      
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An error occurred while checking resource ownership',
      });
    }
  };
}
