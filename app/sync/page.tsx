import { SyncLog } from '@/components/sync/SyncLog'
import { SyncConfig } from '@/components/sync/SyncConfig'
import { SyncButton } from '@/components/stock/SyncButton'
import { getSyncLogs } from '@/lib/db/syncLog'

export const revalidate = 30

export default async function SyncPage() {
  const logs = await getSyncLogs(50).catch(() => [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Sync & Logs</h1>
          <p className="text-sm text-gray-400">Historial de sincronizaciones</p>
        </div>
        <SyncButton />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Historial de sync</div>
          <SyncLog logs={logs} />
        </div>
        <SyncConfig />
      </div>
    </div>
  )
}
