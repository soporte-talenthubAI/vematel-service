import { NextRequest, NextResponse } from 'next/server'
import { getSyncLogsPaginated } from '@/lib/db/syncLog'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get('page') ?? '1', 10)
  const limit = parseInt(sp.get('limit') ?? '20', 10)
  const status = sp.get('status') as 'ok' | 'warning' | 'error' | null
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined
  const to = sp.get('to') ? new Date(sp.get('to')! + 'T23:59:59') : undefined

  const data = await getSyncLogsPaginated({ page, limit, status: status ?? undefined, from, to })
  return NextResponse.json(data)
}
