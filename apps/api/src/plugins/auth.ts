import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { APP_CONFIG } from '../config/app';
import { prisma } from '@lorrigo/db';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      role: string;
      permissions?: object;
    }
    user: {
      id: string;
      email: string;
      role: string;
      permissions?: object;
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (allowedRoles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: typeof prisma;
  }
}

export const registerAuth = async (fastify: FastifyInstance) => {
  // Register JWT plugin
  await fastify.register(fastifyJwt, {
    secret: APP_CONFIG.JWT_SECRET,
    sign: {
      expiresIn: APP_CONFIG.JWT_EXPIRES_IN,
    },
  });

  // Add authentication decorator
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: any) => {
    try {
      await request.jwtVerify();
      
      // Fetch the user from database to validate they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          permissions: true,
        },
      });
      
      // Check if user exists and is active
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }
      
      // Update request.user with the latest user data
      request.user = {
        id: user.id,
        email: user.email as string,
        role: user.role,
        permissions: user.permissions as object,
      };
      
    } catch (err) {
      reply.code(401).send({ 
        statusCode: 401, 
        error: 'Unauthorized',
        message: 'Invalid or expired token' 
      });
    }
  });
  
  // Add role-based authorization decorator
  fastify.decorate('authorize', (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: any) => {
      try {
        // First authenticate the user
        await fastify.authenticate(request, reply);
        
        // Check if the user's role is in the allowed roles
        if (!allowedRoles.includes(request.user.role)) {
          reply.code(403).send({ 
            statusCode: 403, 
            error: 'Forbidden',
            message: 'You do not have permission to access this resource' 
          });
        }
      } catch (err) {
        // Authentication already handles its own errors
      }
    };
  });

  fastify.log.info('Auth plugin registered');
}; 