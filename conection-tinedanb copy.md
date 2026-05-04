# CLAUDE.md — Vematel Integrador
> Este archivo guía a Claude Code para construir el integrador Tienda Nube ↔ Flexus desde cero.  
> Leer completo antes de ejecutar cualquier comando.

---

## CONTEXTO DEL PROYECTO

**Vematel** es una tienda de iluminación, electricidad, herramientas, industrial, hogar y seguridad ubicada en Córdoba, Argentina. Tienen dos canales de venta:

1. **Tienda Nube** (`vematel.com.ar`) — canal online
2. **Flexus** — sistema de gestión del local físico (stock, ventas, clientes)

**Objetivo:** Construir un integrador en Vercel (Next.js) que:
- Sincronice el stock de Flexus → Tienda Nube automáticamente cada 5 minutos
- Muestre un dashboard comparativo con métricas de ambos canales
- Registre logs de cada sincronización
- Alerte sobre diferencias de stock o precios entre sistemas

**Regla de negocio crítica:** Flexus es la fuente de verdad del stock. TN siempre se actualiza desde Flexus, nunca al revés.

**Clave de sincronización:** El código de producto (`VEM-XXXX`) es IDÉNTICO en ambos sistemas. En TN vive en `variant.sku`. En Flexus vive en `articulo.codigo`.

---

## STACK TECNOLÓGICO

- **Framework:** Next.js 14 con App Router
- **Lenguaje:** TypeScript estricto
- **Estilos:** Tailwind CSS
- **Gráficos:** Recharts
- **HTTP client:** Axios
- **State/Cache:** TanStack Query v5
- **Persistencia logs:** Vercel KV (Redis)
- **Validación:** Zod
- **Utilidades:** date-fns, lucide-react, clsx, tailwind-merge
- **Deploy:** Vercel (con cron jobs)

---

## PASO 1 — SETUP INICIAL

```bash
# Ejecutar en la raíz del repo vacío
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --yes

npm install \
  recharts \
  @tanstack/react-query \
  axios \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge \
  @vercel/kv \
  zod \
  nanoid
```

---

## PASO 2 — ESTRUCTURA DE CARPETAS

Crear esta estructura completa antes de escribir código:

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         → redirect a /dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   ├── stock/
│   │   └── page.tsx
│   ├── ventas/
│   │   └── page.tsx
│   ├── productos/
│   │   └── page.tsx
│   ├── sync/
│   │   └── page.tsx
│   └── api/
│       ├── tiendanube/
│       │   ├── products/route.ts
│       │   ├── orders/route.ts
│       │   └── webhooks/route.ts
│       ├── flexus/
│       │   ├── products/route.ts
│       │   ├── stock/route.ts
│       │   └── sales/route.ts
│       └── sync/
│           ├── stock/route.ts
│           ├── prices/route.ts
│           └── status/route.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── SyncStatusBadge.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── SalesChart.tsx
│   │   ├── KpiComparison.tsx
│   │   ├── CategoryDonut.tsx
│   │   ├── TopProducts.tsx
│   │   └── AlertBanner.tsx
│   ├── stock/
│   │   ├── StockDiffTable.tsx
│   │   ├── StockByCategoryChart.tsx
│   │   └── SyncButton.tsx
│   ├── ventas/
│   │   ├── SalesTimeline.tsx
│   │   ├── ChannelMixDonut.tsx
│   │   └── OpportunityTable.tsx
│   ├── productos/
│   │   ├── ProductTable.tsx
│   │   └── ProductFilters.tsx
│   └── sync/
│       ├── SyncLog.tsx
│       └── SyncConfig.tsx
├── lib/
│   ├── tiendanube/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── transformers.ts
│   ├── flexus/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── transformers.ts
│   ├── sync/
│   │   ├── stockSync.ts
│   │   ├── priceSync.ts
│   │   └── diffEngine.ts
│   ├── data/
│   │   ├── dashboard.ts
│   │   ├── stock.ts
│   │   └── sales.ts
│   └── db/
│       ├── index.ts
│       └── syncLog.ts
├── hooks/
│   ├── useSyncStatus.ts
│   └── useProducts.ts
├── types/
│   └── unified.ts
├── .env.local.example
└── vercel.json
```

---

## PASO 3 — VARIABLES DE ENTORNO

Crear `.env.local.example` con este contenido exacto:

```env
# ─── TIENDA NUBE ─────────────────────────────────────────────────────────────
# Obtener desde: panel admin vematel.com.ar → Configuración → Aplicaciones →
# Crear aplicación privada → copiar Store ID y Access Token
# Permisos necesarios: read_products, write_products, read_orders, read_customers
TIENDANUBE_STORE_ID=
TIENDANUBE_ACCESS_TOKEN=

# ─── FLEXUS ──────────────────────────────────────────────────────────────────
# Solicitar a soporte de Flexus: credenciales de API REST
# Endpoint base, API key o usuario/contraseña según su documentación
FLEXUS_API_URL=https://api.flexus.com.ar/v1
FLEXUS_API_KEY=
FLEXUS_USERNAME=
FLEXUS_PASSWORD=

# ─── VERCEL KV ───────────────────────────────────────────────────────────────
# Crear en vercel.com → Storage → KV Database → copiar variables automáticamente
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# ─── SYNC ────────────────────────────────────────────────────────────────────
# Clave secreta para proteger los endpoints de cron. Generar con: openssl rand -hex 32
SYNC_SECRET=
NEXT_PUBLIC_APP_URL=https://vematel-integrador.vercel.app
```

Luego copiar a `.env.local` y completar los valores reales.

---

## PASO 4 — TIPOS UNIFICADOS

Crear `types/unified.ts`:

```typescript
/**
 * Tipo central del integrador.
 * El campo `code` (VEM-XXXX) es la clave que une TN y Flexus.
 * En TN: variant.sku | En Flexus: articulo.codigo
 */
export interface UnifiedProduct {
  code: string
  name: string
  category: string
  stock: {
    tiendaNube: number
    flexus: number
    synced: boolean
    diff: number           // flexus - tiendaNube (positivo = más en Flexus)
    lastSync: Date | null
  }
  price: {
    tiendaNube: number
    flexus: number
    synced: boolean
    diffPct: number
  }
  tnProductId: number
  tnVariantId: number
  status: 'ok' | 'stock_diff' | 'price_diff' | 'both_diff' | 'missing_tn' | 'missing_fx'
}

export interface UnifiedSale {
  id: string
  source: 'tiendanube' | 'flexus'
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  date: Date
  orderId: string
  customer?: string
}

export interface SyncLog {
  id: string
  timestamp: Date
  type: 'stock' | 'price' | 'order' | 'full'
  status: 'ok' | 'warning' | 'error'
  message: string
  productsAffected?: number
  duration?: number
  details?: Record<string, unknown>
}

export interface SyncStatus {
  lastSync: Date | null
  nextSync: Date | null
  status: 'idle' | 'syncing' | 'error'
  stockSynced: number
  stockErrors: number
  stockDiffs: number
  isAutoEnabled: boolean
}

export interface DashboardMetrics {
  period: '7d' | '30d' | '90d'
  salesTN: number
  salesFX: number
  unitsTN: number
  unitsFX: number
  avgTicketTN: number
  avgTicketFX: number
  conversionTN: number
  returnRateTN: number
  returnRateFX: number
  productsSynced: number
  stockDiffs: number
  topProducts: Array<{ code: string; name: string; totalTN: number; totalFX: number }>
  salesByCategory: Array<{ category: string; amountTN: number; amountFX: number }>
  salesTimeline: Array<{ date: string; tn: number; fx: number }>
}
```

---

## PASO 5 — CLIENT TIENDA NUBE

### Base URL y autenticación

```
https://api.tiendanube.com/2025-03/{store_id}/
Headers:
  Authentication: bearer ACCESS_TOKEN
  User-Agent: Vematel-Integrador (info@vematel.com.ar)
  Content-Type: application/json
```

### Rate limit CRÍTICO: 2 req/seg → usar sleep(600) entre PUTs en lote

Crear `lib/tiendanube/types.ts`:

```typescript
export interface TNProduct {
  id: number
  name: { es: string; en?: string }
  categories: Array<{ id: number; name: { es: string } }>
  published: boolean
  updated_at: string
  created_at: string
  variants: TNVariant[]
}

export interface TNVariant {
  id: number
  product_id: number
  sku: string              // ← VEM-XXXX — clave de sync con Flexus
  stock: number | null     // null = sin gestión de stock
  stock_management: boolean
  price: string
  promotional_price: string | null
  cost: string | null
  updated_at: string
}

export interface TNOrder {
  id: number
  number: number
  status: 'open' | 'closed' | 'cancelled'
  payment_status: 'paid' | 'pending' | 'authorized' | 'refunded' | 'voided' | 'abandoned'
  shipping_status: string
  total: string
  subtotal: string
  currency: string
  paid_at: string | null
  created_at: string
  products: TNOrderProduct[]
  customer: { name: string; email: string } | null
}

export interface TNOrderProduct {
  id: number
  product_id: number
  variant_id: number
  sku: string           // ← VEM-XXXX
  name: string
  quantity: number
  price: string
  total: string
}
```

Crear `lib/tiendanube/client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios'
import { TNProduct, TNOrder } from './types'

const BASE = `https://api.tiendanube.com/2025-03/${process.env.TIENDANUBE_STORE_ID}`

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authentication: `bearer ${process.env.TIENDANUBE_ACCESS_TOKEN}`,
      'User-Agent': 'Vematel-Integrador (info@vematel.com.ar)',
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Traer todos los productos paginando (max 200 por página)
export async function getAllTNProducts(): Promise<TNProduct[]> {
  const client = createClient()
  let page = 1
  const all: TNProduct[] = []

  while (true) {
    const { data } = await client.get<TNProduct[]>('/products', {
      params: {
        page,
        per_page: 200,
        fields: 'id,name,variants,categories,published,updated_at',
      },
    })
    if (!data.length) break
    all.push(...data)
    if (data.length < 200) break
    page++
    await sleep(600) // respetar rate limit
  }

  return all
}

// Obtener productos modificados desde una fecha (sync incremental)
export async function getTNProductsUpdatedSince(since: Date): Promise<TNProduct[]> {
  const client = createClient()
  const { data } = await client.get<TNProduct[]>('/products', {
    params: {
      updated_at_min: since.toISOString(),
      per_page: 200,
      fields: 'id,name,variants,categories',
    },
  })
  return data
}

// ENDPOINT PRINCIPAL DE SYNC: actualizar stock de una variante en TN
export async function updateTNVariantStock(
  productId: number,
  variantId: number,
  stock: number
): Promise<void> {
  const client = createClient()
  await client.put(`/products/${productId}/variants/${variantId}`, { stock })
}

// Traer pedidos pagados (para mostrar ventas TN en el dashboard)
export async function getTNOrders(params: {
  since?: Date
  paymentStatus?: string
  page?: number
}): Promise<TNOrder[]> {
  const client = createClient()
  const { data } = await client.get<TNOrder[]>('/orders', {
    params: {
      payment_status: params.paymentStatus ?? 'paid',
      created_at_min: params.since?.toISOString(),
      per_page: 200,
      page: params.page ?? 1,
    },
  })
  return data
}

// Registrar webhook en TN
export async function registerTNWebhook(event: string, url: string) {
  const client = createClient()
  const { data } = await client.post('/webhooks', { event, url })
  return data
}
```

---

## PASO 6 — CLIENT FLEXUS

### NOTA IMPORTANTE sobre Flexus

Flexus es un sistema de gestión argentino. Su API REST puede variar según la versión y configuración del cliente. Antes de implementar, solicitar a soporte de Flexus:
1. URL base de la API
2. Método de autenticación (API key en header, Basic Auth, o token JWT)
3. Documentación de endpoints disponibles
4. Si tiene webhook para notificar cambios de stock en tiempo real

El código a continuación asume una API REST estándar. **Ajustar según la documentación real de Flexus.**

Crear `lib/flexus/types.ts`:

```typescript
// Ajustar nombres de campos según la documentación real de Flexus
export interface FlexusArticulo {
  codigo: string            // ← VEM-XXXX — clave de sync con TN
  descripcion: string
  categoria: string
  subcategoria?: string
  stock_actual: number
  stock_minimo?: number
  precio_venta: number
  precio_costo?: number
  precio_lista?: number
  activo: boolean
  ultima_actualizacion?: string
}

export interface FlexusVenta {
  id: number
  numero: string
  fecha: string             // YYYY-MM-DD
  fecha_hora: string
  tipo: 'factura' | 'remito' | 'ticket'
  estado: string
  total: number
  subtotal: number
  descuento?: number
  cliente?: {
    nombre: string
    cuit?: string
  }
  items: FlexusVentaItem[]
}

export interface FlexusVentaItem {
  codigo: string            // ← VEM-XXXX
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface FlexusStockMovement {
  codigo: string
  cantidad: number          // positivo = entrada, negativo = salida
  motivo: string
  fecha: string
}
```

Crear `lib/flexus/client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios'
import { FlexusArticulo, FlexusVenta } from './types'

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: process.env.FLEXUS_API_URL,
    headers: {
      // Opción A — API Key en header (más común):
      'X-Api-Key': process.env.FLEXUS_API_KEY,

      // Opción B — Basic Auth (descomentar si aplica):
      // Authorization: `Basic ${Buffer.from(`${process.env.FLEXUS_USERNAME}:${process.env.FLEXUS_PASSWORD}`).toString('base64')}`,

      'Content-Type': 'application/json',
    },
    timeout: 15000,
  })
}

// Traer todos los artículos activos con stock
export async function getAllFlexusProducts(): Promise<FlexusArticulo[]> {
  const client = createClient()
  // Ajustar el endpoint según la documentación de Flexus
  // Puede ser: /articulos, /productos, /items, /stock, etc.
  const { data } = await client.get<FlexusArticulo[]>('/articulos', {
    params: { activos: true },
  })
  return data
}

// Traer stock de un artículo específico por código
export async function getFlexusStockByCodigo(codigo: string): Promise<number> {
  const client = createClient()
  const { data } = await client.get<FlexusArticulo>(`/articulos/${codigo}`)
  return data.stock_actual
}

// Traer ventas en un rango de fechas
export async function getFlexusSales(from: Date, to: Date): Promise<FlexusVenta[]> {
  const client = createClient()
  const { data } = await client.get<FlexusVenta[]>('/ventas', {
    params: {
      fecha_desde: from.toISOString().split('T')[0],
      fecha_hasta: to.toISOString().split('T')[0],
    },
  })
  return data
}

// Ajustar stock en Flexus desde TN (si la API lo permite — opcional)
export async function adjustFlexusStock(codigo: string, cantidad: number, motivo: string) {
  const client = createClient()
  await client.post('/stock/ajuste', { codigo, cantidad, motivo })
}
```

---

## PASO 7 — MOTOR DE SINCRONIZACIÓN

Crear `lib/sync/diffEngine.ts`:

```typescript
import { UnifiedProduct } from '@/types/unified'

export interface StockDiff {
  code: string
  name: string
  tnStock: number
  fxStock: number
  diff: number
  diffPct: number
  severity: 'low' | 'medium' | 'high'
  tnProductId: number
  tnVariantId: number
}

export function detectStockDiffs(products: UnifiedProduct[]): StockDiff[] {
  return products
    .filter(p => !p.stock.synced)
    .map(p => {
      const diff = p.stock.flexus - p.stock.tiendaNube
      const diffPct = p.stock.flexus > 0
        ? Math.abs(diff) / p.stock.flexus
        : 1

      return {
        code: p.code,
        name: p.name,
        tnStock: p.stock.tiendaNube,
        fxStock: p.stock.flexus,
        diff,
        diffPct: diffPct * 100,
        severity: diffPct > 0.5 ? 'high' : diffPct > 0.2 ? 'medium' : 'low',
        tnProductId: p.tnProductId,
        tnVariantId: p.tnVariantId,
      }
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
}

export function detectPriceDiffs(products: UnifiedProduct[]) {
  return products
    .filter(p => !p.price.synced)
    .map(p => ({
      code: p.code,
      name: p.name,
      priceTN: p.price.tiendaNube,
      priceFX: p.price.flexus,
      diff: p.price.tiendaNube - p.price.flexus,
      diffPct: ((p.price.tiendaNube - p.price.flexus) / p.price.flexus) * 100,
    }))
    .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct))
}

export function buildUnifiedProducts(
  tnProducts: import('@/lib/tiendanube/types').TNProduct[],
  fxProducts: import('@/lib/flexus/types').FlexusArticulo[]
): UnifiedProduct[] {
  // Mapa Flexus: codigo → articulo
  const fxMap = new Map(fxProducts.map(p => [p.codigo, p]))

  const result: UnifiedProduct[] = []

  for (const tnProd of tnProducts) {
    for (const variant of tnProd.variants) {
      if (!variant.sku) continue
      const fx = fxMap.get(variant.sku)
      if (!fx) continue  // No existe en Flexus — saltar

      const tnStock = variant.stock ?? 0
      const fxStock = fx.stock_actual
      const tnPrice = parseFloat(variant.price)
      const fxPrice = fx.precio_venta

      const stockSynced = tnStock === fxStock
      const priceSynced = Math.abs(tnPrice - fxPrice) < 0.01

      let status: UnifiedProduct['status'] = 'ok'
      if (!stockSynced && !priceSynced) status = 'both_diff'
      else if (!stockSynced) status = 'stock_diff'
      else if (!priceSynced) status = 'price_diff'

      result.push({
        code: variant.sku,
        name: tnProd.name.es,
        category: tnProd.categories[0]?.name?.es ?? 'Sin categoría',
        stock: {
          tiendaNube: tnStock,
          flexus: fxStock,
          synced: stockSynced,
          diff: fxStock - tnStock,
          lastSync: null,
        },
        price: {
          tiendaNube: tnPrice,
          flexus: fxPrice,
          synced: priceSynced,
          diffPct: ((tnPrice - fxPrice) / fxPrice) * 100,
        },
        tnProductId: tnProd.id,
        tnVariantId: variant.id,
        status,
      })
    }
  }

  return result
}
```

Crear `lib/sync/stockSync.ts`:

```typescript
import { getAllTNProducts, updateTNVariantStock } from '@/lib/tiendanube/client'
import { getAllFlexusProducts } from '@/lib/flexus/client'
import { buildUnifiedProducts, detectStockDiffs } from './diffEngine'
import { saveSyncLog, setLastSyncTime } from '@/lib/db/syncLog'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export interface StockSyncResult {
  total: number
  updated: number
  skipped: number
  errors: number
  diffs: Array<{ code: string; tnStock: number; fxStock: number; diff: number }>
  duration: number
}

export async function runStockSync(): Promise<StockSyncResult> {
  const start = Date.now()
  const result: StockSyncResult = {
    total: 0, updated: 0, skipped: 0, errors: 0, diffs: [], duration: 0
  }

  try {
    // 1. Obtener datos de ambas fuentes en paralelo
    const [tnProducts, fxProducts] = await Promise.all([
      getAllTNProducts(),
      getAllFlexusProducts(),
    ])

    // 2. Construir lista unificada y detectar diferencias
    const unified = buildUnifiedProducts(tnProducts, fxProducts)
    const diffs = detectStockDiffs(unified)

    result.total = unified.length
    result.skipped = unified.length - diffs.length
    result.diffs = diffs.map(d => ({
      code: d.code, tnStock: d.tnStock, fxStock: d.fxStock, diff: d.diff
    }))

    // 3. Actualizar TN para cada diferencia (Flexus → TN)
    for (const diff of diffs) {
      const product = unified.find(p => p.code === diff.code)!
      try {
        await updateTNVariantStock(product.tnProductId, product.tnVariantId, diff.fxStock)
        result.updated++
      } catch (err) {
        result.errors++
        console.error(`[SYNC] Error actualizando ${diff.code}:`, err)
      }
      // Rate limit de Tienda Nube: 2 req/seg → esperar 600ms
      await sleep(600)
    }

    result.duration = Date.now() - start
    await setLastSyncTime()

    await saveSyncLog({
      type: 'stock',
      status: result.errors > 0 ? 'warning' : 'ok',
      message: `Sync completada: ${result.updated} actualizados, ${result.skipped} sin cambios, ${result.errors} errores`,
      productsAffected: result.updated,
      duration: result.duration,
      details: { diffs: result.diffs },
    })

    return result

  } catch (err) {
    result.duration = Date.now() - start
    await saveSyncLog({
      type: 'stock',
      status: 'error',
      message: `Error crítico: ${(err as Error).message}`,
      duration: result.duration,
    })
    throw err
  }
}
```

---

## PASO 8 — PERSISTENCIA (VERCEL KV)

Crear `lib/db/syncLog.ts`:

```typescript
import { kv } from '@vercel/kv'
import { SyncLog } from '@/types/unified'
import { nanoid } from 'nanoid'

const LOG_KEY = 'vematel:sync:logs'
const LAST_SYNC_KEY = 'vematel:sync:last'
const MAX_LOGS = 500

export async function saveSyncLog(log: Omit<SyncLog, 'id' | 'timestamp'>): Promise<SyncLog> {
  const entry: SyncLog = { id: nanoid(), timestamp: new Date(), ...log }
  await kv.lpush(LOG_KEY, JSON.stringify(entry))
  await kv.ltrim(LOG_KEY, 0, MAX_LOGS - 1)
  return entry
}

export async function getSyncLogs(limit = 100): Promise<SyncLog[]> {
  const raw = await kv.lrange(LOG_KEY, 0, limit - 1)
  return (raw as string[]).map(r => {
    const parsed = JSON.parse(r)
    return { ...parsed, timestamp: new Date(parsed.timestamp) }
  })
}

export async function getLastSyncTime(): Promise<Date | null> {
  const raw = await kv.get<string>(LAST_SYNC_KEY)
  return raw ? new Date(raw) : null
}

export async function setLastSyncTime(): Promise<void> {
  await kv.set(LAST_SYNC_KEY, new Date().toISOString())
}

export async function getSyncStatus() {
  const lastSync = await getLastSyncTime()
  const logs = await getSyncLogs(10)
  const lastLog = logs[0]

  return {
    lastSync,
    status: lastLog?.status ?? 'idle',
    lastMessage: lastLog?.message ?? 'Sin sincronizaciones registradas',
  }
}
```

---

## PASO 9 — API ROUTES

### `app/api/sync/stock/route.ts`
Endpoint llamado por el cron y por el botón "Sincronizar ahora":

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { runStockSync } from '@/lib/sync/stockSync'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runStockSync()
    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}
```

### `app/api/sync/status/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getSyncStatus, getSyncLogs } from '@/lib/db/syncLog'

export async function GET() {
  const [status, logs] = await Promise.all([
    getSyncStatus(),
    getSyncLogs(50),
  ])
  return NextResponse.json({ status, logs })
}
```

### `app/api/tiendanube/products/route.ts`
Con caché de 5 minutos en KV para no exceder rate limits:

```typescript
import { NextResponse } from 'next/server'
import { getAllTNProducts } from '@/lib/tiendanube/client'
import { getAllFlexusProducts } from '@/lib/flexus/client'
import { buildUnifiedProducts } from '@/lib/sync/diffEngine'
import { kv } from '@vercel/kv'

export async function GET() {
  const cacheKey = 'vematel:unified:products'
  const cached = await kv.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  const [tnProducts, fxProducts] = await Promise.all([
    getAllTNProducts(),
    getAllFlexusProducts(),
  ])

  const unified = buildUnifiedProducts(tnProducts, fxProducts)
  await kv.setex(cacheKey, 300, JSON.stringify(unified)) // 5 min cache
  return NextResponse.json(unified)
}
```

### `app/api/tiendanube/webhooks/route.ts`
Recibir eventos de TN en tiempo real:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const event = await req.json()

  // Cuando se paga un pedido en TN → registrar para actualizar stock Flexus
  if (event.event === 'order/paid') {
    const order = event.order
    console.log(`[WEBHOOK] Pedido TN pagado: #${order.number}`)
    for (const item of order.products ?? []) {
      // item.sku = VEM-XXXX, item.quantity = unidades vendidas
      console.log(`  → ${item.sku} x${item.quantity}`)
      // Si Flexus tiene API para descontar stock, llamarla aquí:
      // await adjustFlexusStock(item.sku, -item.quantity, `Venta TN #${order.number}`)
    }
  }

  if (event.event === 'product/updated') {
    // Invalidar caché cuando se actualiza un producto en TN
    const { kv } = await import('@vercel/kv')
    await kv.del('vematel:unified:products')
  }

  return NextResponse.json({ received: true })
}
```

---

## PASO 10 — CRON JOB VERCEL

Crear `vercel.json` en la raíz:

```json
{
  "crons": [
    {
      "path": "/api/sync/stock",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/sync/prices",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

> ⚠️ Los cron jobs requieren plan Pro de Vercel.  
> En plan Hobby: usar cron-job.org gratis apuntando a `https://tu-app.vercel.app/api/sync/stock` con header `x-sync-secret: TU_SECRET`.

---

## PASO 11 — LAYOUT CON SIDEBAR

### `app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vematel Integrador',
  description: 'Dashboard integrador Tienda Nube + Flexus',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-56 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### `components/layout/Sidebar.tsx`

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, TrendingUp,
  ShoppingBag, RefreshCw
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard, color: '#2D5BFF' },
  { href: '/stock',     label: 'Stock Unificado',  icon: Package,         color: '#F59E0B' },
  { href: '/ventas',    label: 'Ventas',           icon: TrendingUp,      color: '#10B981' },
  { href: '/productos', label: 'Productos',        icon: ShoppingBag,     color: '#8B5CF6' },
  { href: '/sync',      label: 'Sync & Logs',      icon: RefreshCw,       color: '#EF4444' },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 bg-white border-r border-gray-100 h-screen fixed flex flex-col z-10">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">V</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Vematel</div>
            <div className="text-xs text-gray-400">Integrador</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Icon size={15} style={{ color: active ? '#2D5BFF' : color }} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          TN + Flexus activos
        </div>
      </div>
    </aside>
  )
}
```

### `components/layout/TopBar.tsx`

```typescript
'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function TopBar() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('Hace 4 min')

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/sync/stock', {
        method: 'POST',
        headers: { 'x-sync-secret': '' }, // El secret va en env, esto se resuelve server-side
      })
      setLastSync('Hace 1 seg')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-100 h-13 px-5 flex items-center gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">Tienda Nube</span>
        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">Flexus</span>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          Sincronizar ahora
        </button>
        <span className="text-xs text-gray-400">{lastSync}</span>
      </div>
    </header>
  )
}
```

---

## PASO 12 — COMPONENTES REUTILIZABLES

### `components/dashboard/MetricCard.tsx`

```typescript
interface MetricCardProps {
  label: string
  value: string
  delta?: string
  deltaType?: 'up' | 'down'
  sub?: string
  accent?: 'blue' | 'amber' | 'green' | 'purple' | 'red'
}

const accentColors = {
  blue:   'bg-blue-500',
  amber:  'bg-amber-400',
  green:  'bg-emerald-500',
  purple: 'bg-violet-500',
  red:    'bg-red-500',
}

export function MetricCard({ label, value, delta, deltaType, sub, accent = 'blue' }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 relative overflow-hidden shadow-sm">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentColors[accent]}`} />
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold tracking-tight leading-none text-gray-900 mb-1">{value}</div>
      {(delta || sub) && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          {delta && (
            <span className={deltaType === 'up' ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
              {deltaType === 'up' ? '↑' : '↓'} {delta}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}
```

### `components/dashboard/AlertBanner.tsx`

```typescript
'use client'
import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  message: string
  type?: 'warning' | 'error' | 'info'
  onAction?: () => void
  actionLabel?: string
}

export function AlertBanner({ message, type = 'warning', onAction, actionLabel }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className={`${styles[type]} border rounded-xl px-4 py-3 flex items-center gap-3 mb-4`}>
      <AlertTriangle size={16} className="flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {onAction && (
        <button onClick={onAction} className="text-xs font-medium underline">
          {actionLabel ?? 'Ver más'}
        </button>
      )}
      <button onClick={() => setDismissed(true)} className="text-current opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}
```

### `components/dashboard/SalesChart.tsx`

```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: Array<{ date: string; tn: number; fx: number }>
  height?: number
}

const fmt = (v: number) => `$${(v / 1000).toFixed(0)}K`

export function SalesChart({ data, height = 200 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={3} barCategoryGap="30%">
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v: number, name: string) => [
            `$${v.toLocaleString('es-AR')}`,
            name === 'tn' ? 'Tienda Nube' : 'Flexus'
          ]}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend formatter={v => v === 'tn' ? 'Tienda Nube' : 'Flexus'} iconSize={10} iconType="square" />
        <Bar dataKey="tn" fill="#3B82F6" radius={[3, 3, 0, 0]} name="tn" />
        <Bar dataKey="fx" fill="#F59E0B" radius={[3, 3, 0, 0]} name="fx" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### `components/dashboard/KpiComparison.tsx`

```typescript
interface KpiRow {
  label: string
  tn: number
  fx: number
  format: 'currency' | 'units' | 'percent'
  higherIsBetter?: boolean
}

interface Props {
  rows: KpiRow[]
}

function formatVal(v: number, fmt: KpiRow['format']) {
  if (fmt === 'currency') return `$${v.toLocaleString('es-AR')}`
  if (fmt === 'percent') return `${v.toFixed(1)}%`
  return `${v.toLocaleString('es-AR')} u.`
}

export function KpiComparison({ rows }: Props) {
  const max = (row: KpiRow) => Math.max(row.tn, row.fx) || 1

  return (
    <div className="space-y-4">
      {rows.map(row => (
        <div key={row.label}>
          <div className="text-xs text-gray-400 mb-1.5">{row.label}</div>
          <div className="space-y-1.5">
            {(['tn', 'fx'] as const).map(src => {
              const val = row[src]
              const pct = (val / max(row)) * 100
              const color = src === 'tn' ? '#3B82F6' : '#F59E0B'
              return (
                <div key={src} className="flex items-center gap-2">
                  <span className="text-xs font-medium min-w-[24px]"
                    style={{ color }}>{src.toUpperCase()}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs text-gray-500 min-w-[70px] text-right font-mono">
                    {formatVal(val, row.format)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## PASO 13 — PÁGINAS

### `app/page.tsx`

```typescript
import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }
```

### `app/dashboard/page.tsx`

Página del dashboard principal. Usar datos mock mientras las APIs no estén configuradas. La función `getDashboardData()` en `lib/data/dashboard.ts` debe:
1. Llamar a `getAllTNProducts()` y `getAllFlexusProducts()` en paralelo
2. Llamar a `getTNOrders()` y `getFlexusSales()` para el período seleccionado
3. Agregar los datos y devolver `DashboardMetrics`
4. Mientras las APIs no estén listas, devolver datos mock realistas

```typescript
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { KpiComparison } from '@/components/dashboard/KpiComparison'
import { AlertBanner } from '@/components/dashboard/AlertBanner'

// Mock para desarrollo hasta tener credenciales reales
const MOCK_METRICS = {
  salesTN: 847320, salesFX: 1203800,
  unitsTN: 185, unitsFX: 280,
  avgTicketTN: 4580, avgTicketFX: 6320,
  productsSynced: 1847, stockDiffs: 3,
  salesTimeline: [
    { date: 'Lun', tn: 85000, fx: 140000 },
    { date: 'Mar', tn: 92000, fx: 128000 },
    { date: 'Mié', tn: 78000, fx: 162000 },
    { date: 'Jue', tn: 110000, fx: 95000 },
    { date: 'Vie', tn: 130000, fx: 185000 },
    { date: 'Sáb', tn: 180000, fx: 210000 },
    { date: 'Dom', tn: 72000, fx: 130000 },
  ],
}

export default function DashboardPage() {
  const m = MOCK_METRICS
  const total = m.salesTN + m.salesFX

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Resumen unificado Tienda Nube + Flexus</p>
      </div>

      {m.stockDiffs > 0 && (
        <AlertBanner
          message={`${m.stockDiffs} productos con stock desincronizado entre Flexus y Tienda Nube`}
          type="warning"
          actionLabel="Ver diferencias"
        />
      )}

      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Ventas TN — Mes" value={`$${(m.salesTN/1000).toFixed(0)}K`}
          delta="14%" deltaType="up" sub="vs mes anterior" accent="blue" />
        <MetricCard label="Ventas Flexus — Mes" value={`$${(m.salesFX/1000).toFixed(0)}K`}
          delta="8%" deltaType="up" sub="vs mes anterior" accent="amber" />
        <MetricCard label="Total combinado" value={`$${(total/1000).toFixed(0)}K`}
          delta="10.5%" deltaType="up" sub="todos los canales" accent="green" />
        <MetricCard label="Productos sync" value={m.productsSynced.toLocaleString()}
          sub={`${m.stockDiffs} con desvío`} accent={m.stockDiffs > 0 ? 'red' : 'purple'} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-900">Ventas por canal — Últimos 7 días</div>
          </div>
          <SalesChart data={m.salesTimeline} height={220} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-900 mb-3">KPI Comparativo</div>
          <KpiComparison rows={[
            { label: 'Ticket promedio', tn: m.avgTicketTN, fx: m.avgTicketFX, format: 'currency' },
            { label: 'Unidades vendidas', tn: m.unitsTN, fx: m.unitsFX, format: 'units' },
            { label: 'Conversión', tn: 3.6, fx: 7.4, format: 'percent' },
          ]} />
        </div>
      </div>
    </div>
  )
}
```

### `app/stock/page.tsx`, `app/ventas/page.tsx`, `app/productos/page.tsx`, `app/sync/page.tsx`

Seguir el mismo patrón: métricas arriba, gráficos/tablas abajo. Usar datos mock hasta tener APIs configuradas. Implementar las páginas completas con los componentes creados.

---

## PASO 14 — FLUJO COMPLETO DE SYNC (diagrama)

```
CADA 5 MINUTOS (cron Vercel)
         │
         ▼
POST /api/sync/stock
         │
         ├── getAllTNProducts()    → GET /products (TN API, paginado)
         ├── getAllFlexusProducts() → GET /articulos (Flexus API)
         │
         ▼
buildUnifiedProducts()
  → matchea por variant.sku === articulo.codigo (VEM-XXXX)
         │
         ▼
detectStockDiffs()
  → lista productos donde TN stock ≠ Flexus stock
         │
         ▼
Para cada diff:
  updateTNVariantStock(productId, variantId, flexusStock)
  → PUT /products/{id}/variants/{vid} { stock: N }
  → sleep(600ms) para respetar rate limit TN
         │
         ▼
saveSyncLog() → Vercel KV
setLastSyncTime() → Vercel KV

─── FLUJO INVERSO (venta en TN) ────────────────────────────────
TN genera evento order/paid
         │
         ▼
POST /api/tiendanube/webhooks
  → leer items del pedido (sku + quantity)
  → adjustFlexusStock(sku, -quantity, motivo)
         │
         ▼
Stock de Flexus descontado
(próxima sync lo refleja en TN automáticamente)
```

---

## PASO 15 — DEPLOY EN VERCEL

```bash
# 1. CLI de Vercel
npm i -g vercel

# 2. Autenticarse
vercel login

# 3. Linkear repo
vercel link

# 4. Crear KV Database
# → vercel.com → Storage → Create KV Database → conectar al proyecto
# → vercel env pull .env.local  (descarga las vars de KV automáticamente)

# 5. Cargar variables de entorno de TN y Flexus
vercel env add TIENDANUBE_STORE_ID production
vercel env add TIENDANUBE_ACCESS_TOKEN production
vercel env add FLEXUS_API_URL production
vercel env add FLEXUS_API_KEY production
vercel env add SYNC_SECRET production

# 6. Deploy
vercel deploy --prod
```

---

## ORDEN DE IMPLEMENTACIÓN (ejecutar en secuencia)

```
 1. npm create-next-app + instalar dependencias     ← PASO 1
 2. Crear estructura de carpetas completa           ← PASO 2
 3. Crear .env.local.example                        ← PASO 3
 4. Crear types/unified.ts                          ← PASO 4
 5. Crear lib/tiendanube/types.ts                   ← PASO 5
 6. Crear lib/tiendanube/client.ts                  ← PASO 5
 7. Crear lib/flexus/types.ts                       ← PASO 6
 8. Crear lib/flexus/client.ts                      ← PASO 6
 9. Crear lib/sync/diffEngine.ts                    ← PASO 7
10. Crear lib/sync/stockSync.ts                     ← PASO 7
11. Crear lib/db/syncLog.ts                         ← PASO 8
12. Crear app/api/sync/stock/route.ts               ← PASO 9
13. Crear app/api/sync/status/route.ts              ← PASO 9
14. Crear app/api/tiendanube/products/route.ts      ← PASO 9
15. Crear app/api/tiendanube/webhooks/route.ts      ← PASO 9
16. Crear vercel.json                               ← PASO 10
17. Crear app/layout.tsx                            ← PASO 11
18. Crear components/layout/Sidebar.tsx             ← PASO 11
19. Crear components/layout/TopBar.tsx              ← PASO 11
20. Crear components/dashboard/MetricCard.tsx       ← PASO 12
21. Crear components/dashboard/AlertBanner.tsx      ← PASO 12
22. Crear components/dashboard/SalesChart.tsx       ← PASO 12
23. Crear components/dashboard/KpiComparison.tsx    ← PASO 12
24. Crear components/dashboard/CategoryDonut.tsx    (Recharts PieChart)
25. Crear components/dashboard/TopProducts.tsx      (tabla top 10)
26. Crear components/stock/StockDiffTable.tsx       (tabla con severity badges)
27. Crear components/stock/StockByCategoryChart.tsx (BarChart agrupado)
28. Crear components/stock/SyncButton.tsx           (client component con fetch)
29. Crear components/ventas/SalesTimeline.tsx       (LineChart 30 días)
30. Crear components/ventas/ChannelMixDonut.tsx     (PieChart TN vs FX)
31. Crear components/ventas/OpportunityTable.tsx    (productos que rinden más en TN)
32. Crear components/productos/ProductTable.tsx     (tabla con filtros y status)
33. Crear components/productos/ProductFilters.tsx   (selects de categoría y estado)
34. Crear components/sync/SyncLog.tsx               (lista de logs con íconos)
35. Crear components/sync/SyncConfig.tsx            (configuración de sync)
36. Crear app/page.tsx                              (redirect a /dashboard)
37. Crear app/dashboard/page.tsx                    ← PASO 13
38. Crear app/stock/page.tsx
39. Crear app/ventas/page.tsx
40. Crear app/productos/page.tsx
41. Crear app/sync/page.tsx
42. Deploy a Vercel                                 ← PASO 15
```

---

## NOTAS FINALES PARA CLAUDE CODE

- **Usar `'use client'` solo** en componentes que usen hooks de React, eventos del browser, o librerías que no soporten SSR (como Recharts). Las páginas y componentes de layout son Server Components por defecto.
- **Datos mock:** Mientras las credenciales de TN y Flexus no estén en `.env.local`, todos los endpoints de API deben devolver datos mock realistas. Agregar la condición `if (!process.env.TIENDANUBE_ACCESS_TOKEN) return MOCK_DATA`.
- **Flexus:** Si la API de Flexus no responde o no está documentada todavía, implementar un cliente mock que lea de un JSON local con datos representativos.
- **Rate limit TN:** Nunca hacer más de 2 requests por segundo a la API de Tienda Nube. Usar siempre el `sleep(600)` entre requests en lote.
- **TypeScript estricto:** No usar `any`. Si el tipo no se conoce, usar `unknown` y narrowing.
- **Estilos:** Usar solo Tailwind CSS, sin CSS modules ni styled-components.
- **Errores:** Todos los API routes deben tener try/catch y devolver el status HTTP correcto.
