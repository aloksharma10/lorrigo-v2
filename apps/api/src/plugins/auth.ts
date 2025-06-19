import { FastifyPluginAsync, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { FastifyRequest } from 'fastify';
import { prisma } from '@lorrigo/db';
import redis from '@/lib/redis';
import { queues } from '@/lib/queue';

// Define our custom user type
interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: object;
  plan?: any;
  [key: string]: any;
}

// Extend the FastifyRequest interface to use our custom type
declare module 'fastify' {
  interface FastifyRequest {
    userPayload: UserPayload | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (
      allowedRoles: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: typeof prisma;
    redis: typeof redis;
    queues: typeof queues;
  }
}

interface AuthPluginOptions {
  // Options for the plugin
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, _options) => {
  // Register JWT plugin for verification
  await fastify.register(import('@fastify/jwt'), {
    secret: process.env.AUTH_SECRET || 'fallback-secret-do-not-use-in-production',
  });

  // Decorator to add userPayload to request
  fastify.decorateRequest('userPayload', null);

  // Hook to verify the JWT token on specified routes
  // fastify.addHook('onRequest', async (request, reply) => {
  //   try {
  //     // Skip auth for non-protected routes
  //     const routePath = request.routeOptions?.url || request.url;
  //     if (
  //       routePath.startsWith('/api/public') ||
  //       routePath.startsWith('/docs') ||
  //       routePath === '/health' ||
  //       routePath.startsWith('/auth')
  //     ) {
  //       return;
  //     }

  //     const authHeader = request.headers.authorization;

  //     if (!authHeader) {
  //       return reply.code(401).send({ error: 'Unauthorized: No token provided' });
  //     }

  //     // Format: "Bearer {token}"
  //     const token = authHeader.replace('Bearer ', '');

  //     try {
  //       // Verify token using jose
  //       const secret = new TextEncoder().encode(
  //         process.env.AUTH_SECRET || 'fallback-secret-do-not-use-in-production'
  //       );

  //       const { payload } = await jwtVerify(token, secret);

  //       if (!payload) {
  //         return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  //       }

  //       // Add user to request with proper mapping
  //       request.userPayload = {
  //         id: payload.sub || '',
  //         email: typeof payload.email === 'string' ? payload.email : '',
  //         role: typeof payload.role === 'string' ? payload.role : '',
  //         ...payload,
  //       };
  //     } catch (err) {
  //       return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  //     }
  //   } catch (error) {
  //     request.log.error(error, 'Error authenticating request');
  //     return reply.code(401).send({ error: 'Unauthorized: Authentication failed' });
  //   }
  // });

  // Add authentication decorator
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload: any = await request.jwtVerify();

      if (!payload?.id) {
        throw new Error('User ID not found in token');
      }

      const user = await prisma.user.findUnique({
        where: {
          id: payload.id,
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          permissions: true,
          plan: {
            include: {
              plan_courier_pricings: {
                include: {
                  courier: true,
                  zone_pricing: true,
                },
              },
            },
          },
        },
      });

      // Check if user exists and is active
      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Update request.userPayload with the latest user data
      request.userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions as object,
        plan: user.plan,
      };
    } catch (err) {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });

  // Add role-based authorization decorator
  fastify.decorate('authorize', (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // First authenticate the user
        await fastify.authenticate(request, reply);

        // Check if the user's role is in the allowed roles
        if (!request.userPayload?.role || !allowedRoles.includes(request.userPayload.role)) {
          reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have permission to access this resource',
          });
        }
      } catch (err) {
        // Authentication already handles its own errors
      }
    };
  });

  fastify.log.info('Auth plugin registered');
};

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
});
