'use client'

import { RefreshCw, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function TopBar({ title }: { title: string }) {
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  async function triggerSync() {
    setSyncing(true)
    try {
      await fetch('/api/sync/manual', { method: 'POST' })
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="h-12 border-b border-gray-100 bg-white flex items-center justify-between px-5 flex-shrink-0">
      <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando…' : 'Sync manual'}
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut size={13} />
          Salir
        </button>
      </div>
    </header>
  )
}
