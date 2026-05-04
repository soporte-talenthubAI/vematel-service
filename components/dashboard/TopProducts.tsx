interface Props {
  products: Array<{ code: string; name: string; total: number }>
}

export function TopProducts({ products }: Props) {
  const max = products[0]?.total ?? 1

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="text-sm font-medium mb-3">Top productos</div>
      <div className="space-y-3">
        {products.slice(0, 6).map((p) => (
          <div key={p.code}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 truncate max-w-[160px]">{p.name}</span>
              <span className="font-medium ml-2">
                ${p.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full">
              <div
                className="h-1 bg-blue-500 rounded-full"
                style={{ width: `${(p.total / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
