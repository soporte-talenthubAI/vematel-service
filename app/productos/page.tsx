'use client'

import { useState, useEffect } from 'react'
import { ProductTable } from '@/components/productos/ProductTable'
import { ProductFilters } from '@/components/productos/ProductFilters'
import type { UnifiedProduct } from '@/types/unified'

export default function ProductosPage() {
  const [all, setAll] = useState<UnifiedProduct[]>([])
  const [filtered, setFiltered] = useState<UnifiedProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tiendanube/products').then((r) => r.json()).catch(() => []),
      fetch('/api/flexus/products').then((r) => r.json()).catch(() => []),
    ])
      .then(([tnRaw, fxRaw]) => {
        const tnList = Array.isArray(tnRaw) ? tnRaw : []
        const fxList = Array.isArray(fxRaw) ? fxRaw : []

        const fxMap = new Map(
          fxList.map((p: { codigo: string; stock_actual: number; precio_venta: number }) => [p.codigo, p]),
        )

        const products: UnifiedProduct[] = []
        for (const tnProd of tnList as Array<{
          id: number
          name: { es: string }
          categories: Array<{ name: { es: string } }>
          variants: Array<{ sku: string; stock: number | null; price: string }>
        }>) {
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
              stock: { tiendaNube: tnStock, flexus: fxStock, synced: tnStock === fxStock, diff: fxStock - tnStock, lastSync: new Date() },
              price: { tiendaNube: tnPrice, flexus: fxPrice, synced: tnPrice === fxPrice },
              status: !fxArt ? 'missing_fx' : tnStock !== fxStock ? 'stock_diff' : tnPrice !== fxPrice ? 'price_diff' : 'ok',
            })
          }
        }
        setAll(products)
        setFiltered(products)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Productos</h1>
        <p className="text-sm text-gray-400">Catálogo unificado TN + Flexus</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Cargando productos…</div>
      ) : (
        <>
          <ProductFilters products={all} onFilter={setFiltered} />
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-400 mb-3">{filtered.length} productos</div>
            <ProductTable products={filtered} />
          </div>
        </>
      )}
    </div>
  )
}
