import type { UnifiedProduct } from '@/types/unified'

export interface StockDiff {
  code: string
  name: string
  tnStock: number
  fxStock: number
  diff: number
  severity: 'low' | 'medium' | 'high'
}

export interface PriceDiff {
  code: string
  name: string
  priceTN: number
  priceFX: number
  diff: number
  pctDiff: number
}

export function detectStockDiffs(products: UnifiedProduct[]): StockDiff[] {
  return products
    .filter((p) => !p.stock.synced)
    .map((p) => {
      const diff = p.stock.flexus - p.stock.tiendaNube
      const pct = p.stock.flexus > 0 ? Math.abs(diff) / p.stock.flexus : 1
      return {
        code: p.code,
        name: p.name,
        tnStock: p.stock.tiendaNube,
        fxStock: p.stock.flexus,
        diff,
        severity: (pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low') as StockDiff['severity'],
      }
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
}

export function detectPriceDiffs(products: UnifiedProduct[]): PriceDiff[] {
  return products
    .filter((p) => !p.price.synced)
    .map((p) => ({
      code: p.code,
      name: p.name,
      priceTN: p.price.tiendaNube,
      priceFX: p.price.flexus,
      diff: p.price.tiendaNube - p.price.flexus,
      pctDiff: ((p.price.tiendaNube - p.price.flexus) / p.price.flexus) * 100,
    }))
}
