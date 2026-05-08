import { NextResponse } from 'next/server'
import { syncStock } from '@/lib/sync/stockSync'

// Endpoint para el botón del dashboard — sin secret porque es acción del usuario
export async function POST() {
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
