import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        // Only log queries when DEBUG is enabled (reduces overhead in production)
        log: process.env.DEBUG === 'true' ? ['query'] : [],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
