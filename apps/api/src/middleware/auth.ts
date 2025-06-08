import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@lorrigo/db';

interface Permission {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Middleware to check if user is authenticated
 * Returns 401 if userPayload is missing
 */
export async function checkAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userPayload) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
}

/**
 * Middleware for authenticating user
 * Uses the Fastify JWT authentication
 */
export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Use the authenticate decorator from the auth plugin
    await request.jwtVerify();

    // Check if userPayload exists after verification
    if (!request.userPayload) {
      throw new Error('User authentication failed');
    }
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
      await authenticateUser(request, reply);

      const userRole = request.userPayload?.role as Role;

      if (userRole !== 'ADMIN' && !roles.includes(userRole)) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
      }
    } catch (err) {
      // Optional: Log the error or handle custom auth errors
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
      const user_permissions = (request.userPayload?.permissions || []) as Permission[];

      // If the user is an ADMIN, they have all permissions
      if (request.userPayload?.role === 'ADMIN') {
        return;
      }

      // Check if the user has all required permissions
      const hasAllPermissions = requiredPermissions.every((permission) =>
        user_permissions.some((p) => p.name === permission && p.isActive)
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
export function authorizeOwner(resource_id_param: string, resource_type: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // First authenticate the user
      await authenticateUser(request, reply);

      // Get the resource ID from the request params
      const resource_id = (request.params as any)[resource_id_param];

      if (!resource_id) {
        return reply.code(400).send({
          status_code: 400,
          error: 'Bad Request',
          message: `${resource_type} ID is required`,
        });
      }

      // If the user is an ADMIN or SUBADMIN, they can access any resource
      if (['ADMIN', 'SUBADMIN'].includes(request.userPayload?.role || '')) {
        return;
      }

      // Get the prisma client from the fastify instance
      const prisma = (request as any).server.prisma;

      // Check if the resource exists and belongs to the user
      let resource;

      switch (resource_type) {
        case 'order':
          resource = await prisma.order.findUnique({
            where: { id: resource_id },
            select: { user_id: true },
          });
          break;
        case 'shipment':
          resource = await prisma.shipment.findUnique({
            where: { id: resource_id },
            select: { user_id: true },
          });
          break;
        case 'customer':
          resource = await prisma.customer.findUnique({
            where: { id: resource_id },
            select: { user_id: true },
          });
          break;
        default:
          return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: `Unsupported resource type: ${resource_type}`,
          });
      }

      if (!resource) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `${resource_type.charAt(0).toUpperCase() + resource_type.slice(1)} not found`,
        });
      }

      if (resource.user_id !== request.userPayload?.id) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: `You do not have permission to access this ${resource_type}`,
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
