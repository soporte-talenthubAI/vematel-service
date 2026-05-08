'use client'

import { useEffect, useState, useCallback } from 'react'
import { SyncConfig } from '@/components/sync/SyncConfig'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

type SyncLog = {
  id: string
  timestamp: string
  type: string
  status: 'ok' | 'warning' | 'error'
  message: string
  productsAffected: number | null
  details?: {
    total?: number
    updated?: number
    skipped?: number
    errors?: number
    duration?: number
    diffs?: Array<{ code: string; name: string; tnStock: number; fxStock: number; diff: number }>
  }
}

type Page = { logs: SyncLog[]; total: number; page: number; totalPages: number }

const STATUS_STYLES = {
  ok: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
}

const STATUS_LABELS = { ok: 'OK', warning: 'Aviso', error: 'Error' }

export default function SyncPage() {
  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/sync/logs?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [page, status, from, to])

  useEffect(() => { load() }, [load])

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleFilter() {
    setPage(1)
    load()
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Sync & Logs</h1>
        <p className="text-sm text-gray-400">Historial de sincronizaciones automáticas</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value="ok">OK</option>
                <option value="warning">Aviso</option>
                <option value="error">Error</option>
              </select>
            </div>
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Filtrar
            </button>
            {(from || to || status) && (
              <button
                onClick={() => { setFrom(''); setTo(''); setStatus(''); setPage(1) }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            )}
            {data && (
              <span className="ml-auto text-xs text-gray-400">{data.total} registros</span>
            )}
          </div>

          {/* Logs */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="text-sm text-gray-400 text-center py-12">Cargando…</div>
            ) : !data?.logs.length ? (
              <div className="text-sm text-gray-400 text-center py-12">Sin registros</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.logs.map((log) => {
                  const isOpen = expanded.has(log.id)
                  const hasDiffs = (log.details?.diffs?.length ?? 0) > 0
                  return (
                    <div key={log.id}>
                      <div
                        className={clsx(
                          'flex items-start gap-3 px-4 py-3',
                          hasDiffs ? 'cursor-pointer hover:bg-gray-50/60' : '',
                        )}
                        onClick={() => hasDiffs && toggleExpanded(log.id)}
                      >
                        {/* Estado */}
                        <span className={clsx('mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', STATUS_STYLES[log.status])}>
                          {STATUS_LABELS[log.status]}
                        </span>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-700">{log.message}</span>
                            {log.details?.duration != null && (
                              <span className="text-[10px] text-gray-400">{(log.details.duration / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {log.details?.total != null && (
                              <span className="text-[10px] text-gray-400">
                                {log.details.total} procesados · {log.details.updated ?? 0} actualizados · {log.details.skipped ?? 0} sin cambio
                                {(log.details.errors ?? 0) > 0 && <span className="text-red-500"> · {log.details.errors} errores</span>}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Fecha */}
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {format(new Date(log.timestamp), "dd/MM/yy HH:mm", { locale: es })}
                        </span>

                        {/* Chevron */}
                        {hasDiffs && (
                          <span className="text-gray-400 shrink-0">
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        )}
                      </div>

                      {/* Detalle de cambios */}
                      {isOpen && hasDiffs && (
                        <div className="px-4 pb-3 pt-0">
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b border-gray-100">
                                  <th className="text-left px-3 py-2 font-medium">Producto</th>
                                  <th className="text-right px-3 py-2 font-medium text-blue-500">TN antes</th>
                                  <th className="text-right px-3 py-2 font-medium text-amber-500">Flexus</th>
                                  <th className="text-right px-3 py-2 font-medium">Cambio</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {log.details!.diffs!.map((d) => (
                                  <tr key={d.code}>
                                    <td className="px-3 py-2">
                                      <div className="font-medium text-gray-800 truncate max-w-[240px]">{d.name || d.code}</div>
                                      <div className="text-[10px] text-gray-400 font-mono">{d.code}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">{d.tnStock}</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{d.fxStock}</td>
                                    <td className={clsx('px-3 py-2 text-right font-semibold', d.diff > 0 ? 'text-emerald-600' : 'text-red-600')}>
                                      {d.diff > 0 ? `+${d.diff}` : d.diff}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Paginación */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-gray-400 text-xs">
                Página {data.page} de {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>

        <SyncConfig />
      </div>
    </div>
  )
}
