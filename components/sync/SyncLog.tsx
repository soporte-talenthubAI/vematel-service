import type { SyncLog as SyncLogType } from '@/types/unified'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_STYLES = {
  ok: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
}

const TYPE_LABELS = {
  stock: 'Stock',
  price: 'Precios',
  order: 'Pedido',
  full: 'Completo',
}

interface Props {
  logs: SyncLogType[]
}

export function SyncLog({ logs }: Props) {
  if (!logs.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Sin logs de sincronización</p>
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-50 hover:bg-gray-50/50"
        >
          <span
            className={clsx(
              'mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
              STATUS_STYLES[log.status],
            )}
          >
            {log.status.toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">
                {TYPE_LABELS[log.type]}
              </span>
              {log.productsAffected != null && (
                <span className="text-xs text-gray-400">
                  · {log.productsAffected} productos
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{log.message}</p>
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">
            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: es })}
          </span>
        </div>
      ))}
    </div>
  )
}
