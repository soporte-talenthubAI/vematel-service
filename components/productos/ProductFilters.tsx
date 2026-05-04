'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { UnifiedProduct } from '@/types/unified'

interface Props {
  onFilter: (products: UnifiedProduct[]) => void
  products: UnifiedProduct[]
}

export function ProductFilters({ products, onFilter }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<UnifiedProduct['status'] | 'all'>('all')

  function apply(q: string, s: typeof status) {
    let result = products
    if (q) {
      const lower = q.toLowerCase()
      result = result.filter(
        (p) => p.code.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower),
      )
    }
    if (s !== 'all') result = result.filter((p) => p.status === s)
    onFilter(result)
  }

  function handleQuery(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    apply(e.target.value, status)
  }

  function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as typeof status
    setStatus(val)
    apply(query, val)
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={handleQuery}
          placeholder="Buscar código o nombre…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>
      <select
        value={status}
        onChange={handleStatus}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="all">Todos</option>
        <option value="ok">OK</option>
        <option value="stock_diff">Stock diff</option>
        <option value="price_diff">Precio diff</option>
        <option value="missing_tn">Sin TN</option>
        <option value="missing_fx">Sin Flexus</option>
      </select>
    </div>
  )
}
