'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export function SyncButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [summary, setSummary] = useState('')

  async function handleSync() {
    setState('loading')
    setSummary('')
    try {
      const res = await fetch('/api/sync/manual', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const r = json.result
      setSummary(`${r.updated} actualizados · ${r.skipped} sin cambios · ${r.errors} errores`)
      setState('ok')
    } catch (err) {
      setSummary((err as Error).message)
      setState('error')
    }
  }

  return (
    <div className="flex items-center gap-3">
      {summary && (
        <span className="text-xs text-gray-500">{summary}</span>
      )}
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {state === 'loading' && <RefreshCw size={14} className="animate-spin" />}
        {state === 'ok' && <CheckCircle size={14} />}
        {state === 'error' && <AlertCircle size={14} />}
        {state === 'idle' && <RefreshCw size={14} />}
        {state === 'loading' ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>
    </div>
  )
}
