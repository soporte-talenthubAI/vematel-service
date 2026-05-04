import { getAllTNProducts } from '@/lib/tiendanube/client'
import { getFlexusProducts } from '@/lib/flexus/client'
import { detectStockDiffs } from '@/lib/sync/diffEngine'
import type { UnifiedProduct } from '@/types/unified'
import type { StockDiff } from '@/lib/sync/diffEngine'

interface StockData {
  products: UnifiedProduct[]
  diffs: StockDiff[]
  summary: {
    totalTN: number
    totalFX: number
    synced: number
    total: number
  }
}

export async function getUnifiedStock(): Promise<StockData> {
  const [tnProducts, fxProducts] = await Promise.all([
    getAllTNProducts().catch(() => []),
    getFlexusProducts().catch(() => []),
  ])

  const fxMap = new Map(fxProducts.map((p) => [p.codigo, p]))
  const now = new Date()

  const products: UnifiedProduct[] = []

  for (const tnProd of tnProducts) {
    for (const variant of tnProd.variants) {
      if (!variant.sku) continue
      const fxArt = fxMap.get(variant.sku)
      const tnStock = variant.stock ?? 0
      const fxStock = fxArt?.stock_actual ?? 0
      const tnPrice = parseFloat(variant.price)
      const fxPrice = fxArt?.precio_venta ?? 0

      products.push({
        code: variant.sku,
        name: tnProd.name.es,
        category: tnProd.categories[0]?.name.es ?? 'Sin categoría',
        stock: {
          tiendaNube: tnStock,
          flexus: fxStock,
          synced: tnStock === fxStock,
          diff: fxStock - tnStock,
          lastSync: now,
        },
        price: {
          tiendaNube: tnPrice,
          flexus: fxPrice,
          synced: tnPrice === fxPrice,
        },
        status: !fxArt
          ? 'missing_fx'
          : tnStock !== fxStock
            ? 'stock_diff'
            : tnPrice !== fxPrice
              ? 'price_diff'
              : 'ok',
      })
    }
  }

  const diffs = detectStockDiffs(products)

  const summary = {
    totalTN: products.reduce((s, p) => s + p.stock.tiendaNube, 0),
    totalFX: products.reduce((s, p) => s + p.stock.flexus, 0),
    synced: products.filter((p) => p.stock.synced).length,
    total: products.length,
  }

  return { products, diffs, summary }
}
