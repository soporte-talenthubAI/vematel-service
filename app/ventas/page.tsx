import { MetricCard } from '@/components/dashboard/MetricCard'
import { SalesTimeline } from '@/components/ventas/SalesTimeline'
import { ChannelMix } from '@/components/ventas/ChannelMix'
import { getDashboardData } from '@/lib/data/dashboard'

export const revalidate = 300

export default async function VentasPage() {
  const data = await getDashboardData()

  const fmt = (n: number) =>
    `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Ventas</h1>
        <p className="text-sm text-gray-400">Comparativo por canal — últimos 7 días</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Ventas TN" value={fmt(data.salesTN)} accent="blue" />
        <MetricCard label="Ventas Flexus" value={fmt(data.salesFX)} accent="amber" />
        <MetricCard
          label="Ticket prom. TN"
          value={fmt(data.ticketPromedioTN)}
          accent="green"
        />
        <MetricCard
          label="Ticket prom. Flexus"
          value={fmt(data.ticketPromedioFX)}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Evolución de ventas</div>
          <SalesTimeline data={data.salesTimeline} />
        </div>
        <ChannelMix salesTN={data.salesTN} salesFX={data.salesFX} />
      </div>
    </div>
  )
}
