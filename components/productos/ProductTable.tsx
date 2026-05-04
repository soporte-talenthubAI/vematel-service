import type { UnifiedProduct } from '@/types/unified'
import { clsx } from 'clsx'

const STATUS_STYLES: Record<UnifiedProduct['status'], string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  stock_diff: 'bg-orange-100 text-orange-700',
  price_diff: 'bg-yellow-100 text-yellow-700',
  missing_tn: 'bg-red-100 text-red-700',
  missing_fx: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<UnifiedProduct['status'], string> = {
  ok: 'OK',
  stock_diff: 'Stock diff',
  price_diff: 'Precio diff',
  missing_tn: 'Sin TN',
  missing_fx: 'Sin Flexus',
}

interface Props {
  products: UnifiedProduct[]
}

export function ProductTable({ products }: Props) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left py-2.5 font-medium">Código</th>
            <th className="text-left py-2.5 font-medium">Nombre</th>
            <th className="text-left py-2.5 font-medium">Categoría</th>
            <th className="text-right py-2.5 font-medium text-blue-500">Stock TN</th>
            <th className="text-right py-2.5 font-medium text-amber-500">Stock FX</th>
            <th className="text-right py-2.5 font-medium">Precio TN</th>
            <th className="text-right py-2.5 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.map((p) => (
            <tr key={p.code} className="hover:bg-gray-50/50">
              <td className="py-2 font-mono text-gray-600">{p.code}</td>
              <td className="py-2 max-w-[200px] truncate">{p.name}</td>
              <td className="py-2 text-gray-500">{p.category}</td>
              <td className="py-2 text-right">{p.stock.tiendaNube}</td>
              <td className="py-2 text-right">{p.stock.flexus}</td>
              <td className="py-2 text-right">
                ${p.price.tiendaNube.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </td>
              <td className="py-2 text-right">
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    STATUS_STYLES[p.status],
                  )}
                >
                  {STATUS_LABELS[p.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
