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

export async function getSyncLogs(limit = 50): Promise<SyncLog[]> {
  const rows = await prisma.syncLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
  return rows as unknown as SyncLog[]
}

export async function getLastSyncTime(): Promise<Date | null> {
  const row = await prisma.syncLog.findFirst({
    where: { status: 'ok' },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  })
  return row?.timestamp ?? null
}
