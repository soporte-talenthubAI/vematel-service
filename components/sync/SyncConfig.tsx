export function SyncConfig() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="text-sm font-medium mb-4">Configuración de sync</div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-gray-50">
          <span className="text-gray-600">Sync automática</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
            Activa
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-50">
          <span className="text-gray-600">Frecuencia</span>
          <span className="text-gray-800 font-medium">Cada 5 minutos</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-50">
          <span className="text-gray-600">Fuente de verdad</span>
          <span className="text-gray-800 font-medium">Flexus → Tienda Nube</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Rate limit TN</span>
          <span className="text-gray-800 font-medium">600ms entre requests</span>
        </div>
      </div>
    </div>
  )
}
