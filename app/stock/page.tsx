import { MetricCard } from '@/components/dashboard/MetricCard'
import { StockDiffTable } from '@/components/stock/StockDiffTable'
import { StockByCategory } from '@/components/stock/StockByCategory'
import { getUnifiedStock } from '@/lib/data/stock'

export const revalidate = 60

export default async function StockPage() {
  const { products, diffs, summary } = await getUnifiedStock()

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Stock Unificado</h1>
        <p className="text-sm text-gray-400">
          Flexus es la fuente de verdad — TN se actualiza desde Flexus
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard
          label="Stock total TN"
          value={`${summary.totalTN.toLocaleString()} u.`}
          accent="blue"
        />
        <MetricCard
          label="Stock total Flexus"
          value={`${summary.totalFX.toLocaleString()} u.`}
          accent="amber"
        />
        <MetricCard
          label="Sincronizados"
          value={summary.synced.toString()}
          sub={`${((summary.synced / (summary.total || 1)) * 100).toFixed(1)}% del total`}
          accent="green"
        />
        <MetricCard label="Con desvío" value={diffs.length.toString()} accent="purple" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Diferencias detectadas</div>
          <StockDiffTable diffs={diffs} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Stock por categoría</div>
          <StockByCategory products={products} />
        </div>
      </div>
    </div>
  )
}
