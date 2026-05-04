export interface UnifiedProduct {
  code: string
  name: string
  category: string
  stock: {
    tiendaNube: number
    flexus: number
    synced: boolean
    diff: number
    lastSync: Date
  }
  price: {
    tiendaNube: number
    flexus: number
    synced: boolean
  }
  status: 'ok' | 'stock_diff' | 'price_diff' | 'missing_tn' | 'missing_fx'
}

export interface UnifiedSale {
  id: string
  source: 'tiendanube' | 'flexus'
  productCode: string
  quantity: number
  total: number
  date: Date
  customer?: string
}

export interface SyncLog {
  id: string
  timestamp: Date
  type: 'stock' | 'price' | 'order' | 'full'
  status: 'ok' | 'warning' | 'error'
  message: string
  details?: Record<string, unknown>
  productsAffected?: number
}

export interface SyncStatus {
  lastSync: Date | null
  nextSync: Date | null
  status: 'idle' | 'syncing' | 'error'
  stockSynced: number
  stockErrors: number
  isAutoSyncEnabled: boolean
}

export interface DashboardMetrics {
  salesTN: number
  salesFX: number
  totalSales: number
  unitsTN: number
  unitsFX: number
  avgTicketTN: number
  avgTicketFX: number
  topProducts: Array<{ code: string; name: string; total: number }>
  salesByCategory: Array<{ category: string; amount: number }>
  salesTimeline: Array<{ date: string; tn: number; fx: number }>
  productsSynced: number
  stockDiffs: number
}
