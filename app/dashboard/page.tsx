import { MetricCard } from '@/components/dashboard/MetricCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { KpiComparison } from '@/components/dashboard/KpiComparison'
import { TopProducts } from '@/components/dashboard/TopProducts'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { getDashboardData } from '@/lib/data/dashboard'

export const revalidate = 300

export default async function DashboardPage() {
  const data = await getDashboardData()

  const fmt = (n: number) =>
    `$${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 0 })}K`

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-400">Resumen unificado Tienda Nube + Flexus</p>
      </div>

      {data.stockDiffs > 0 && (
        <AlertBanner
          message={`${data.stockDiffs} productos con stock desincronizado`}
          type="warning"
        />
      )}

      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard
          label="Ventas TN — 7 días"
          value={fmt(data.salesTN)}
          accent="blue"
        />
        <MetricCard
          label="Ventas Flexus — 7 días"
          value={fmt(data.salesFX)}
          accent="amber"
        />
        <MetricCard
          label="Total combinado"
          value={fmt(data.totalSales)}
          accent="green"
        />
        <MetricCard
          label="Productos sync"
          value={data.productsSynced.toLocaleString()}
          sub={`${data.stockDiffs} con desvío`}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Ventas por canal — Últimos 7 días</div>
          <SalesChart data={data.salesTimeline} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">KPI Comparativo</div>
          <KpiComparison metrics={data} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TopProducts products={data.topProducts} />
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Ventas por categoría</div>
          <CategoryDonut data={data.salesByCategory} />
        </div>
      </div>
    </div>
  )
}
