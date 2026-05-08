interface Props {
  label: string
  value: string
  delta?: string
  deltaType?: 'up' | 'down'
  sub?: string
  accent?: 'blue' | 'amber' | 'green' | 'purple' | 'red'
}

const ACCENT_BAR: Record<NonNullable<Props['accent']>, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
  purple: 'bg-violet-500',
  red: 'bg-red-500',
}

export function MetricCard({
  label,
  value,
  delta,
  deltaType,
  sub,
  accent = 'blue',
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${ACCENT_BAR[accent]}`} />
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight leading-none mb-1">{value}</div>
      {(delta || sub) && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          {delta && (
            <span className={deltaType === 'up' ? 'text-emerald-500' : 'text-red-500'}>
              {deltaType === 'up' ? '↑' : '↓'} {delta}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}
