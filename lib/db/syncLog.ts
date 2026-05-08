import { prisma } from './index'
import type { SyncLog } from '@/types/unified'

export async function saveSyncLog(
  log: Omit<SyncLog, 'id' | 'timestamp'>,
): Promise<SyncLog> {
  const entry = await prisma.syncLog.create({
    data: {
      type: log.type,
      status: log.status,
      message: log.message,
      productsAffected: log.productsAffected ?? null,
      details: log.details ? JSON.parse(JSON.stringify(log.details)) : undefined,
    },
  })
  return entry as unknown as SyncLog
}

export interface SyncLogsQuery {
  page?: number
  limit?: number
  from?: Date
  to?: Date
  status?: 'ok' | 'warning' | 'error'
}

export interface SyncLogPage {
  logs: SyncLog[]
  total: number
  page: number
  totalPages: number
}

export async function getSyncLogs(limitOrQuery: number | SyncLogsQuery = 50): Promise<SyncLog[]> {
  const limit = typeof limitOrQuery === 'number' ? limitOrQuery : (limitOrQuery.limit ?? 50)
  const rows = await prisma.syncLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
  return rows as unknown as SyncLog[]
}

export async function getSyncLogsPaginated(query: SyncLogsQuery = {}): Promise<SyncLogPage> {
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const skip = (page - 1) * limit

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to ? {
      timestamp: {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      },
    } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.syncLog.count({ where }),
  ])

  return {
    logs: rows as unknown as SyncLog[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getLastSyncTime(): Promise<Date | null> {
  const row = await prisma.syncLog.findFirst({
    where: { status: 'ok' },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  })
  return row?.timestamp ?? null
}
