import { PrismaClient as PrismaClientClass } from '@prisma/client';

// Create PrismaClient instance for Prisma 6.x
const globalForPrisma = global as unknown as { prisma: PrismaClientClass };

export const prisma = globalForPrisma.prisma || new PrismaClientClass();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
