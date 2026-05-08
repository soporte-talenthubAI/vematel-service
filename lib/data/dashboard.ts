import { getAllTNProducts } from '@/lib/tiendanube/client'
import { getFlexusProducts, getFlexusSales } from '@/lib/flexus/client'
import { getTNOrders } from '@/lib/tiendanube/client'
import { subDays } from 'date-fns'
import type { DashboardMetrics } from '@/types/unified'

export async function getDashboardData(): Promise<
  DashboardMetrics & { productsSynced: number; stockDiffs: number }
> {
  const from = subDays(new Date(), 30)
  const to = new Date()

  const [tnProducts, fxProducts, tnOrders, fxSales] = await Promise.all([
    getAllTNProducts().catch(() => []),
    getFlexusProducts().catch(() => []),
    getTNOrders(subDays(new Date(), 7)).catch(() => []),
    getFlexusSales(subDays(new Date(), 7), to).catch(() => []),
  ])

  // Ventas TN últimos 7 días
  const salesTN = tnOrders.reduce((sum, o) => sum + parseFloat(o.total), 0)
  const unitsTN = tnOrders.reduce(
    (sum, o) => sum + o.products.reduce((s, p) => s + p.quantity, 0),
    0,
  )

  // Ventas Flexus últimos 7 días
  const salesFX = fxSales.reduce((sum, v) => sum + v.total, 0)
  const unitsFX = fxSales.reduce(
    (sum, v) => sum + v.articulos.reduce((s, a) => s + a.cantidad, 0),
    0,
  )

  // Timeline últimos 7 días agrupado por día
  const today = new Date()
  const tnByDay = new Map<string, number>()
  for (const order of tnOrders) {
    const key = new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    tnByDay.set(key, (tnByDay.get(key) ?? 0) + parseFloat(order.total))
  }
  const fxByDay = new Map<string, number>()
  for (const venta of fxSales) {
    const key = new Date(venta.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    fxByDay.set(key, (fxByDay.get(key) ?? 0) + venta.total)
  }
  const salesTimeline = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i)
    const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    return { date: dateStr, tn: tnByDay.get(dateStr) ?? 0, fx: fxByDay.get(dateStr) ?? 0 }
  })

  // Stock sync status
  const fxMap = new Map(fxProducts.map((p) => [p.codigo, p]))
  let synced = 0
  let diffs = 0
  for (const tnProd of tnProducts) {
    for (const variant of tnProd.variants) {
      if (!variant.sku) continue
      const fxArt = fxMap.get(variant.sku)
      if (!fxArt) continue
      if ((variant.stock ?? 0) === fxArt.stock_actual) synced++
      else diffs++
    }
  }

  // Top productos Flexus por total vendido
  const productSales = new Map<string, { name: string; total: number }>()
  for (const venta of fxSales) {
    for (const art of venta.articulos) {
      const existing = productSales.get(art.codigo) ?? { name: art.codigo, total: 0 }
      existing.total += art.subtotal
      productSales.set(art.codigo, existing)
    }
  }
  const topProducts = Array.from(productSales.entries())
    .map(([code, v]) => ({ code, name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  // Ventas por categoría (Flexus)
  const catMap = new Map<string, number>()
  for (const prod of fxProducts) {
    const existing = catMap.get(prod.categoria) ?? 0
    const prodSales = productSales.get(prod.codigo)?.total ?? 0
    catMap.set(prod.categoria, existing + prodSales)
  }
  const salesByCategory = Array.from(catMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  return {
    salesTN,
    salesFX,
    totalSales: salesTN + salesFX,
    unitsTN,
    unitsFX,
    avgTicketTN: unitsTN > 0 ? salesTN / unitsTN : 0,
    avgTicketFX: unitsFX > 0 ? salesFX / unitsFX : 0,
    topProducts,
    salesByCategory,
    salesTimeline,
    productsSynced: synced,
    stockDiffs: diffs,
  }
}
