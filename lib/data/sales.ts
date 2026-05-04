import { getTNOrders } from '@/lib/tiendanube/client'
import { getFlexusSales } from '@/lib/flexus/client'
import { subDays } from 'date-fns'
import type { UnifiedSale } from '@/types/unified'

export async function getUnifiedSales(days = 30): Promise<UnifiedSale[]> {
  const from = subDays(new Date(), days)
  const to = new Date()

  const [tnOrders, fxVentas] = await Promise.all([
    getTNOrders(from).catch(() => []),
    getFlexusSales(from, to).catch(() => []),
  ])

  const sales: UnifiedSale[] = []

  for (const order of tnOrders) {
    for (const item of order.products) {
      sales.push({
        id: `tn-${order.id}-${item.sku}`,
        source: 'tiendanube',
        productCode: item.sku,
        quantity: item.quantity,
        total: parseFloat(item.price) * item.quantity,
        date: new Date(order.created_at),
        customer: order.customer?.name,
      })
    }
  }

  for (const venta of fxVentas) {
    for (const art of venta.articulos) {
      sales.push({
        id: `fx-${venta.id}-${art.codigo}`,
        source: 'flexus',
        productCode: art.codigo,
        quantity: art.cantidad,
        total: art.subtotal,
        date: new Date(venta.fecha),
        customer: venta.cliente,
      })
    }
  }

  return sales.sort((a, b) => b.date.getTime() - a.date.getTime())
}
