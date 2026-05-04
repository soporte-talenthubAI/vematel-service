import type { DashboardMetrics } from '@/types/unified'

const fmt = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

interface Row {
  label: string
  tn: string
  fx: string
}

export function KpiComparison({ metrics }: { metrics: DashboardMetrics }) {
  const rows: Row[] = [
    { label: 'Ventas', tn: fmt(metrics.salesTN), fx: fmt(metrics.salesFX) },
    { label: 'Unidades', tn: metrics.unitsTN.toString(), fx: metrics.unitsFX.toString() },
    {
      label: 'Ticket prom.',
      tn: fmt(metrics.avgTicketTN),
      fx: fmt(metrics.avgTicketFX),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 text-xs text-gray-400 font-medium pb-1 border-b border-gray-50">
        <span>Métrica</span>
        <span className="text-blue-500 text-center">TN</span>
        <span className="text-amber-500 text-center">Flexus</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-3 text-sm">
          <span className="text-gray-500 text-xs">{row.label}</span>
          <span className="font-medium text-center">{row.tn}</span>
          <span className="font-medium text-center">{row.fx}</span>
        </div>
      ))}
    </div>
  )
}
