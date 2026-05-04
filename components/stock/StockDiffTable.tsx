import type { StockDiff } from '@/lib/sync/diffEngine'
import { clsx } from 'clsx'

const SEVERITY_BADGE: Record<StockDiff['severity'], string> = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
}

interface Props {
  diffs: StockDiff[]
}

export function StockDiffTable({ diffs }: Props) {
  if (!diffs.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Sin diferencias — stock sincronizado
      </p>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-50">
            <th className="text-left py-2 font-medium">Código</th>
            <th className="text-right py-2 font-medium">TN</th>
            <th className="text-right py-2 font-medium">Flexus</th>
            <th className="text-right py-2 font-medium">Diff</th>
            <th className="text-right py-2 font-medium">Nivel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {diffs.map((d) => (
            <tr key={d.code} className="hover:bg-gray-50/50">
              <td className="py-2 font-mono text-gray-700">{d.code}</td>
              <td className="py-2 text-right text-gray-600">{d.tnStock}</td>
              <td className="py-2 text-right text-gray-600">{d.fxStock}</td>
              <td
                className={clsx(
                  'py-2 text-right font-medium',
                  d.diff > 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {d.diff > 0 ? `+${d.diff}` : d.diff}
              </td>
              <td className="py-2 text-right">
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    SEVERITY_BADGE[d.severity],
                  )}
                >
                  {d.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
