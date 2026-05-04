import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
