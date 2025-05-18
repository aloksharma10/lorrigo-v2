import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { captureException } from '@/lib/sentry';

import { AuthService } from '../services/auth-services';

// Add type augmentation for Fastify
// declare module 'fastify' {
//   interface FastifyInstance {
//     prisma: PrismaClient;
//     jwt: JWT;
//     authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//   }

//   interface FastifyRequest {
//     user: {
//       id: string;
//       email: string;
//       role: string;
//       permissions?: object;
//     };
//   }
// }

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

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const data = registerSchema.parse(request.body);

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Register user using service
      const result = await this.authService.register({
        ...data,
        password: hashedPassword,
      });

      // Return user data and token
      return reply.code(201).send({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        token: result.token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const { email, password } = loginSchema.parse(request.body);

      // Login user using service
      const result = await this.authService.login(email, password);

      if ('error' in result) {
        return reply.code(401).send({
          message: result.error,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.userPayload) {
        return reply.code(401).send({
          message: 'Unauthorized',
        });
      }
      
      return await this.authService.getMe(request.userPayload.id);
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.userPayload) {
        return reply.code(401).send({
          message: 'Unauthorized',
        });
      }
      
      await this.authService.logout(request.userPayload.id, request.ip);
      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
}
