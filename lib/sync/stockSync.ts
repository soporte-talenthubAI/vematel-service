import { getAllTNProducts, updateTNStock } from '@/lib/tiendanube/client'
import { getFlexusProducts } from '@/lib/flexus/client'
import { saveSyncLog } from '@/lib/db/syncLog'

export interface StockSyncResult {
  total: number
  updated: number
  skipped: number
  errors: number
  diffs: Array<{ code: string; name: string; tnStock: number; fxStock: number; diff: number }>
  duration: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function syncStock(): Promise<StockSyncResult> {
  const startTime = Date.now()
  const result: StockSyncResult = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    diffs: [],
    duration: 0,
  }

  try {
    const [tnProducts, fxProducts] = await Promise.all([
      getAllTNProducts(),
      getFlexusProducts(),
    ])

    const fxMap = new Map(fxProducts.map((a) => [a.codigo, a]))

    type TNVariantRef = { productId: number; variantId: number; stock: number; name: string }
    const tnMap = new Map<string, TNVariantRef>()
    for (const prod of tnProducts) {
      for (const variant of prod.variants) {
        if (variant.sku) {
          tnMap.set(variant.sku, {
            productId: prod.id,
            variantId: variant.id,
            stock: variant.stock ?? 0,
            name: prod.name.es,
          })
        }
      }
    }

    result.total = tnMap.size

    for (const [codigo, fxArt] of fxMap) {
      const tnRef = tnMap.get(codigo)
      if (!tnRef) continue

      const fxStock = fxArt.stock_actual
      const tnStock = tnRef.stock

      if (fxStock === tnStock) {
        result.skipped++
        continue
      }

      result.diffs.push({ code: codigo, name: tnRef.name, tnStock, fxStock, diff: fxStock - tnStock })

      try {
        await updateTNStock(tnRef.productId, tnRef.variantId, fxStock)
        result.updated++
      } catch (err) {
        result.errors++
        console.error(`Error actualizando ${codigo}:`, err)
      }

      // Rate limit TN: 2 req/seg
      await sleep(600)
    }

    result.duration = Date.now() - startTime

    await saveSyncLog({
      type: 'stock',
      status: result.errors > 0 ? 'warning' : 'ok',
      message: `Sync completada: ${result.updated} actualizados, ${result.errors} errores`,
      productsAffected: result.updated,
      details: result as unknown as Record<string, unknown>,
    })

    return result
  } catch (err) {
    await saveSyncLog({
      type: 'stock',
      status: 'error',
      message: `Error crítico en sync: ${(err as Error).message}`,
    })
    throw err
  }
}
