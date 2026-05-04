import { NextRequest, NextResponse } from 'next/server'
import { syncStock } from '@/lib/sync/stockSync'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncStock()
    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 },
    )
  }
}
