import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@lorrigo/db';

// Extend the FastifyRequest interface to use our custom user type
declare module 'fastify' {
  interface UserPayload {
    id: string;
    email: string;
    role: string;
    permissions?: object;
    [key: string]: any;
  }

  interface FastifyRequest {
    userPayload: UserPayload | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (
      allowedRoles: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: typeof prisma;
  }
} 