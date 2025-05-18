import { PrismaClient as PrismaClientClass } from '@prisma/client';

// Define a global interface to avoid TypeScript errors
declare global {
  var prisma: PrismaClientClass | undefined;
}

// Create PrismaClient instance for Prisma 6.x
export const prisma = global.prisma || new PrismaClientClass();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
