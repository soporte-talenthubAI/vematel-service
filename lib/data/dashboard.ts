import { getAllTNProducts, getAllTNOrders } from '@/lib/tiendanube/client'
import { getFlexusProducts, getFlexusSales } from '@/lib/flexus/client'
import { subDays, startOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface DashboardData {
  // Ventas TN (30 días, solo pagadas)
  salesTN: number
  ordenesTN: number
  ticketPromedioTN: number
  unidadesTN: number

  // Ventas Flexus (30 días)
  salesFX: number
  ordenesFX: number
  ticketPromedioFX: number
  unidadesFX: number

  // Inventario TN
  totalProductosTN: number
  productosSinStock: number
  productosStockBajo: number
  valorInventarioTN: number

  // Sync
  productsSynced: number
  stockDiffs: number

  // Comparativo mes anterior (TN)
  salesTNMesAnterior: number
  crecimientoTN: number // porcentaje

  // Timeline 30 días
  salesTimeline: Array<{ date: string; tn: number; fx: number }>

  // Top productos vendidos TN
  topProductos: Array<{ sku: string; nombre: string; unidades: number; total: number }>

  // Alertas de stock
  alertasStock: Array<{ sku: string; nombre: string; stock: number; categoria: string }>

  // Estado de conexiones
  tnConnected: boolean
  flexusConnected: boolean
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date()
  const desde30d = subDays(now, 30)
  const desde60d = subDays(now, 60)

  const [tnProducts, fxProducts, ordenes30d, ordenes60d, fxSales] = await Promise.all([
    getAllTNProducts().catch(() => []),
    getFlexusProducts().catch(() => []),
    getAllTNOrders(desde30d).catch(() => []),
    getAllTNOrders(desde60d).catch(() => []),
    getFlexusSales(desde30d, now).catch(() => []),
  ])

  const tnConnected = tnProducts.length > 0
  const flexusConnected = fxProducts.length > 0

  // ── Ventas TN ──────────────────────────────────────────────
  const salesTN = ordenes30d.reduce((s, o) => s + parseFloat(o.total || '0'), 0)
  const ordenesTN = ordenes30d.length
  const unidadesTN = ordenes30d.reduce(
    (s, o) => s + o.products.reduce((ps, p) => ps + p.quantity, 0),
    0,
  )
  const ticketPromedioTN = ordenesTN > 0 ? salesTN / ordenesTN : 0

  // Mes anterior: órdenes entre -60d y -30d
  const ordenesMesAnterior = ordenes60d.filter(o => {
    const d = new Date(o.created_at)
    return d >= desde60d && d < desde30d
  })
  const salesTNMesAnterior = ordenesMesAnterior.reduce(
    (s, o) => s + parseFloat(o.total || '0'),
    0,
  )
  const crecimientoTN =
    salesTNMesAnterior > 0
      ? ((salesTN - salesTNMesAnterior) / salesTNMesAnterior) * 100
      : 0

  // ── Ventas Flexus ──────────────────────────────────────────
  const salesFX = fxSales.reduce((s, v) => s + v.total, 0)
  const ordenesFX = fxSales.length
  const unidadesFX = fxSales.reduce(
    (s, v) => s + v.articulos.reduce((ps, a) => ps + a.cantidad, 0),
    0,
  )
  const ticketPromedioFX = ordenesFX > 0 ? salesFX / ordenesFX : 0

  // ── Inventario TN ──────────────────────────────────────────
  let totalProductosTN = 0
  let productosSinStock = 0
  let productosStockBajo = 0
  let valorInventarioTN = 0
  const alertasStock: DashboardData['alertasStock'] = []

  for (const prod of tnProducts) {
    for (const v of prod.variants) {
      if (!v.sku) continue
      totalProductosTN++
      const stock = v.stock ?? 0
      const precio = parseFloat(v.price || '0')
      valorInventarioTN += stock * precio

      if (stock === 0) {
        productosSinStock++
        alertasStock.push({
          sku: v.sku,
          nombre: prod.name.es,
          stock: 0,
          categoria: prod.categories[0]?.name?.es ?? 'Sin categoría',
        })
      } else if (stock <= 3) {
        productosStockBajo++
        alertasStock.push({
          sku: v.sku,
          nombre: prod.name.es,
          stock,
          categoria: prod.categories[0]?.name?.es ?? 'Sin categoría',
        })
      }
    }
  }

  // ── Sync TN ↔ Flexus ──────────────────────────────────────
  const fxMap = new Map(fxProducts.map(p => [p.codigo, p]))
  let productsSynced = 0
  let stockDiffs = 0
  for (const prod of tnProducts) {
    for (const v of prod.variants) {
      if (!v.sku) continue
      const fx = fxMap.get(v.sku)
      if (!fx) continue
      if ((v.stock ?? 0) === fx.stock_actual) productsSynced++
      else stockDiffs++
    }
  }

  // ── Timeline 30 días ──────────────────────────────────────
  const tnByDay = new Map<string, number>()
  for (const o of ordenes30d) {
    const key = format(startOfDay(new Date(o.created_at)), 'dd/MM', { locale: es })
    tnByDay.set(key, (tnByDay.get(key) ?? 0) + parseFloat(o.total || '0'))
  }
  const fxByDay = new Map<string, number>()
  for (const v of fxSales) {
    const key = format(startOfDay(new Date(v.fecha)), 'dd/MM', { locale: es })
    fxByDay.set(key, (fxByDay.get(key) ?? 0) + v.total)
  }
  const salesTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(now, 29 - i)
    const key = format(startOfDay(d), 'dd/MM', { locale: es })
    return { date: key, tn: tnByDay.get(key) ?? 0, fx: fxByDay.get(key) ?? 0 }
  })

  // ── Top productos vendidos (TN, 30d) ──────────────────────
  const prodMap = new Map<string, { nombre: string; unidades: number; total: number }>()
  for (const o of ordenes30d) {
    for (const item of o.products) {
      if (!item.sku) continue
      const existing = prodMap.get(item.sku) ?? { nombre: item.name, unidades: 0, total: 0 }
      existing.unidades += item.quantity
      existing.total += parseFloat(item.price || '0') * item.quantity
      prodMap.set(item.sku, existing)
    }
  }
  const topProductos = Array.from(prodMap.entries())
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  return {
    salesTN,
    ordenesTN,
    ticketPromedioTN,
    unidadesTN,
    salesFX,
    ordenesFX,
    ticketPromedioFX,
    unidadesFX,
    totalProductosTN,
    productosSinStock,
    productosStockBajo,
    valorInventarioTN,
    productsSynced,
    stockDiffs,
    salesTNMesAnterior,
    crecimientoTN,
    salesTimeline,
    topProductos,
    alertasStock: alertasStock.slice(0, 10),
    tnConnected,
    flexusConnected,
  }
}
