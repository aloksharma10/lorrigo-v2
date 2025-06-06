import { FastifyInstance } from 'fastify';
import { AuthController } from './controller/auth-controller';
import { AuthService } from './services/auth-services';

export default async function auth(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);
  const authController = new AuthController(authService);

  // Register route
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'business_name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 },
          business_name: { type: 'string', minLength: 2 },
          phone: { type: 'string', minLength: 10, maxLength: 10 },
          gstin: { type: 'string', nullable: true },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.register(request, reply),
  });

  // Login route
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
              },
            },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.login(request, reply),
  });

  // Me route
  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get current user information',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            business_name: { type: 'string' },
            permissions: { type: 'object' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => authController.getMe(request, reply),
  });

  // Logout route
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout user',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => authController.logout(request, reply),
  });
}
