'use client'

import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function TopBar({ title }: { title: string }) {
  const [syncing, setSyncing] = useState(false)

  async function triggerSync() {
    setSyncing(true)
    try {
      await fetch('/api/sync/stock', {
        method: 'POST',
        headers: { 'x-sync-secret': '' },
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="h-12 border-b border-gray-100 bg-white flex items-center justify-between px-5">
      <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
      <button
        onClick={triggerSync}
        disabled={syncing}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
      >
        <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Sincronizando…' : 'Sync manual'}
      </button>
    </header>
  )
}
