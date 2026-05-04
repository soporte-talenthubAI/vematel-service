import type { UnifiedProduct } from '@/types/unified'

interface Props {
  products: UnifiedProduct[]
}

export function StockByCategory({ products }: Props) {
  const byCategory = products.reduce<Record<string, { tn: number; fx: number; count: number }>>(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = { tn: 0, fx: 0, count: 0 }
      acc[p.category].tn += p.stock.tiendaNube
      acc[p.category].fx += p.stock.flexus
      acc[p.category].count++
      return acc
    },
    {},
  )

  const rows = Object.entries(byCategory).sort((a, b) => b[1].fx - a[1].fx)

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-50">
            <th className="text-left py-2 font-medium">Categoría</th>
            <th className="text-right py-2 font-medium">Productos</th>
            <th className="text-right py-2 font-medium text-blue-500">TN</th>
            <th className="text-right py-2 font-medium text-amber-500">Flexus</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(([cat, s]) => (
            <tr key={cat} className="hover:bg-gray-50/50">
              <td className="py-2 text-gray-700">{cat}</td>
              <td className="py-2 text-right text-gray-500">{s.count}</td>
              <td className="py-2 text-right font-medium">{s.tn.toLocaleString()}</td>
              <td className="py-2 text-right font-medium">{s.fx.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
