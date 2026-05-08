import { getDashboardData } from '@/lib/data/dashboard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { MetricCard } from '@/components/dashboard/MetricCard'

export const revalidate = 300

const $ar = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Últimos 30 días · datos en tiempo real</p>
        </div>
        {/* Status conexiones */}
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${d.tnConnected ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${d.tnConnected ? 'bg-blue-500' : 'bg-red-500'}`} />
            Tienda Nube {d.tnConnected ? 'conectada' : 'sin conexión'}
          </span>
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${d.flexusConnected ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${d.flexusConnected ? 'bg-amber-500' : 'bg-gray-300'}`} />
            Flexus {d.flexusConnected ? 'conectado' : 'pendiente'}
          </span>
        </div>
      </div>

      {/* Alertas críticas */}
      {d.productosSinStock > 0 && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-xl">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span><strong>{d.productosSinStock} productos sin stock</strong> en Tienda Nube — riesgo de venta perdida</span>
        </div>
      )}

      {/* KPIs principales — ventas */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Ventas</p>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard
            label="Facturación TN"
            value={$ar(d.salesTN)}
            delta={pct(d.crecimientoTN)}
            deltaType={d.crecimientoTN >= 0 ? 'up' : 'down'}
            sub="vs mes anterior"
            accent="blue"
          />
          <MetricCard
            label="Órdenes TN"
            value={d.ordenesTN.toString()}
            sub={`${d.unidadesTN} unidades vendidas`}
            accent="blue"
          />
          <MetricCard
            label="Ticket promedio TN"
            value={$ar(d.ticketPromedioTN)}
            accent="blue"
          />
          <MetricCard
            label="Facturación Flexus"
            value={d.flexusConnected ? $ar(d.salesFX) : '—'}
            sub={d.flexusConnected ? `${d.ordenesFX} órdenes` : 'Sin configurar'}
            accent="amber"
          />
        </div>
      </div>

      {/* KPIs inventario */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Inventario</p>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard
            label="Valor inventario TN"
            value={$ar(d.valorInventarioTN)}
            sub="stock × precio de venta"
            accent="green"
          />
          <MetricCard
            label="SKUs activos"
            value={d.totalProductosTN.toString()}
            sub="variantes con SKU"
            accent="green"
          />
          <MetricCard
            label="Sin stock"
            value={d.productosSinStock.toString()}
            sub="requieren reposición"
            accent={d.productosSinStock > 0 ? 'red' : 'green'}
          />
          <MetricCard
            label="Stock crítico (≤3)"
            value={d.productosStockBajo.toString()}
            sub="menos de 3 unidades"
            accent={d.productosStockBajo > 0 ? 'amber' : 'green'}
          />
        </div>
      </div>

      {/* Gráfico ventas 30 días */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Ventas diarias — últimos 30 días</p>
            <p className="text-xs text-gray-400 mt-0.5">Solo pedidos pagados</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Tienda Nube</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Flexus</span>
          </div>
        </div>
        <SalesChart data={d.salesTimeline} />
      </div>

      {/* Top productos + Alertas stock */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top productos */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">Top productos vendidos — TN (30d)</p>
          {d.topProductos.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin ventas registradas en el período</p>
          ) : (
            <div className="space-y-2">
              {d.topProductos.map((p, i) => (
                <div key={p.sku} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-4 text-right font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.sku} · {p.unidades} u.</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{$ar(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de stock */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Alertas de stock
            {d.alertasStock.length > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                {d.alertasStock.length}
              </span>
            )}
          </p>
          {d.alertasStock.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm py-4 justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Todos los productos tienen stock
            </div>
          ) : (
            <div className="space-y-2">
              {d.alertasStock.map(a => (
                <div key={a.sku} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.stock === 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{a.nombre}</p>
                    <p className="text-xs text-gray-400">{a.sku} · {a.categoria}</p>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${a.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {a.stock === 0 ? 'SIN STOCK' : `${a.stock} u.`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Sync status — solo si Flexus está configurado */}
      {d.flexusConnected && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">Estado de sincronización TN ↔ Flexus</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-emerald-600">{d.productsSynced}</p>
              <p className="text-xs text-gray-400 mt-0.5">Sincronizados</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-semibold ${d.stockDiffs > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{d.stockDiffs}</p>
              <p className="text-xs text-gray-400 mt-0.5">Con diferencia de stock</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-600">{d.productsSynced + d.stockDiffs}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total matcheados</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
