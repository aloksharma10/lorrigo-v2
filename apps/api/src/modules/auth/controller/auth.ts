import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { captureException } from '../../../lib/sentry';
import { PrismaClient } from '@lorrigo/db';
import { JWT } from '@fastify/jwt';

// Add type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    jwt: JWT;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      role: string;
      permissions?: object;
    }
  }
}

// Define request body schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  business_name: z.string().min(2),
  phone: z.string().min(10).max(10),
  gstin: z.string().min(15).max(15).optional(),
});

export default async function auth(fastify: FastifyInstance) {
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
          phone: { type: 'string' , nullable: true, minLength: 10, maxLength: 10},
          gstin: { type: 'string' , nullable: true, minLength: 15, maxLength: 15},
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
    handler: async (request, reply) => {
      try {
        // Validate request body
        const { email, password, name, business_name, phone, gstin } = registerSchema.parse(request.body);
        
        // Check if user already exists
        const existingUser = await fastify.prisma.user.findUnique({
          where: { email },
        });
        
        if (existingUser) {
          return reply.code(400).send({
            message: 'User with this email already exists',
          });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user in database
        const user = await fastify.prisma.user.create({
          data: {
            code: `US-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            email,
            password: hashedPassword,
            name,
            business_name,
            phone,
            gstin,
            role: 'SELLER', // Default role for new registrations
          },
        });
        
        // Create wallet for user
        await fastify.prisma.wallet.create({
          data: {
            code: `WL-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            balance: 0,
            user_id: user.id,
          },
        });
        
        // Generate JWT token
        const token = fastify.jwt.sign({
          id: user.id,
          email: user.email,
          role: user.role,
        });
        
        // Return user data (excluding password) and token
        return reply.code(201).send({
          id: user.id,
          email: user.email,
          name: user.name,
          token,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            message: 'Validation error',
            errors: error.errors,
          });
        }
        
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
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
    handler: async (request, reply) => {
      try {
        // Validate request body
        const { email, password } = loginSchema.parse(request.body);
        
        // Find user by email
        const user = await fastify.prisma.user.findUnique({
          where: { email },
        });
        
        // Check if user exists
        if (!user) {
          return reply.code(401).send({
            message: 'Invalid email or password',
          });
        }
        
        // Check if user is active
        if (!user.is_active) {
          return reply.code(401).send({
            message: 'Your account has been deactivated. Please contact support.',
          });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password as string);
        
        if (!isPasswordValid) {
          return reply.code(401).send({
            message: 'Invalid email or password',
          });
        }
        
        // Create API request log
        await fastify.prisma.apiRequest.create({
          data: {
            code: `AR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            endpoint: '/login',
            method: 'POST',
            ip_address: request.ip,
            user_id: user.id,
            // userAgent: request.headers['user-agent'],
            response_status: 200,
          },
        });
        
        // Generate JWT token
        const token = fastify.jwt.sign({
          id: user.id,
          email: user.email,
          role: user.role,
        });
        
        // Return user data (excluding password) and token
        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            message: 'Validation error',
            errors: error.errors,
          });
        }
        
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
  
  // Me route - Get current user
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
    handler: async (request, reply) => {
      try {
        // Get user from database with more details
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            business_name: true,
            permissions: true,
          },
        });
        
        return user;
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
  
  // Logout route
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout user (client-side only)',
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
    handler: async (request, reply) => {
      try {
        // Create API request log
        await fastify.prisma.apiRequest.create({
          data: {
            code: `AR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            endpoint: '/logout',
            method: 'POST',
            ip_address: request.ip,
            user_id: request.user.id,
            // userAgent: request.headers['user-agent'],
            response_status: 200,
          },
        });
        
        return {
          message: 'Logged out successfully',
        };
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
} 