import { NextRequest, NextResponse } from 'next/server'
import { updateFlexusStock } from '@/lib/flexus/client'
import { saveSyncLog } from '@/lib/db/syncLog'

export async function POST(req: NextRequest) {
  try {
    const event = await req.json()

    if (event.event === 'order/paid') {
      for (const item of event.order?.products ?? []) {
        if (!item.sku) continue
        try {
          await updateFlexusStock(item.sku, -item.quantity)
        } catch (err) {
          console.error(`Error ajustando stock Flexus para ${item.sku}:`, err)
        }
      }

      await saveSyncLog({
        type: 'order',
        status: 'ok',
        message: `Pedido TN #${event.order?.id} procesado — stock ajustado en Flexus`,
        productsAffected: event.order?.products?.length ?? 0,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
