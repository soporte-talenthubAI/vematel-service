import { NextResponse } from 'next/server'
import { getLastSyncTime, getSyncLogs } from '@/lib/db/syncLog'

export async function GET() {
  try {
    const [lastSync, logs] = await Promise.all([
      getLastSyncTime(),
      getSyncLogs(1),
    ])

    const lastLog = logs[0]

    return NextResponse.json({
      lastSync,
      status: lastLog?.status ?? 'idle',
      lastMessage: lastLog?.message ?? null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
