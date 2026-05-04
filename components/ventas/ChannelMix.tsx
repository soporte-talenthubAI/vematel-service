interface Props {
  salesTN: number
  salesFX: number
}

export function ChannelMix({ salesTN, salesFX }: Props) {
  const total = salesTN + salesFX || 1
  const pctTN = Math.round((salesTN / total) * 100)
  const pctFX = 100 - pctTN

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="text-sm font-medium mb-4">Mix de canales</div>
      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        <div className="bg-blue-500" style={{ width: `${pctTN}%` }} />
        <div className="bg-amber-400" style={{ width: `${pctFX}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-600">Tienda Nube</span>
          <span className="font-semibold">{pctTN}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-gray-600">Flexus</span>
          <span className="font-semibold">{pctFX}%</span>
        </div>
      </div>
    </div>
  )
}
