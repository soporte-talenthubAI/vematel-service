# VEMATEL INTEGRADOR — Plan completo para Claude Code
> Repo Vercel · Next.js 14 App Router · TypeScript · Tailwind CSS  
> Integración Tienda Nube ↔ Flexus · Dashboard con métricas · Sincronización de stock · DB: Neon + Prisma ORM

---

## ARQUITECTURA GENERAL

```
vematel-integrador/
├── app/
│   ├── layout.tsx                  # Layout raíz con sidebar
│   ├── page.tsx                    # Redirect a /dashboard
│   ├── dashboard/page.tsx          # Vista resumen general
│   ├── stock/page.tsx              # Stock unificado TN + Flexus
│   ├── ventas/page.tsx             # Ventas comparadas por canal
│   ├── productos/page.tsx          # Catálogo unificado
│   ├── sync/page.tsx               # Logs y configuración de sync
│   └── api/
│       ├── tiendanube/
│       │   ├── products/route.ts   # GET productos TN
│       │   ├── orders/route.ts     # GET pedidos TN
│       │   └── webhooks/route.ts   # POST webhook TN → Flexus
│       ├── flexus/
│       │   ├── products/route.ts   # GET productos Flexus
│       │   ├── stock/route.ts      # GET stock Flexus
│       │   ├── sales/route.ts      # GET ventas Flexus
│       │   └── webhook/route.ts    # POST webhook Flexus → TN
│       └── sync/
│           ├── stock/route.ts      # POST sincronizar stock
│           ├── prices/route.ts     # POST sincronizar precios
│           └── status/route.ts     # GET estado de sync
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── TabNav.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── SalesChart.tsx
│   │   ├── KpiComparison.tsx
│   │   ├── CategoryDonut.tsx
│   │   ├── TopProducts.tsx
│   │   └── AlertBanner.tsx
│   ├── stock/
│   │   ├── StockDiffTable.tsx
│   │   ├── StockByCategory.tsx
│   │   └── SyncButton.tsx
│   ├── ventas/
│   │   ├── SalesTimeline.tsx
│   │   ├── ChannelMix.tsx
│   │   └── OpportunityTable.tsx
│   ├── productos/
│   │   ├── ProductTable.tsx
│   │   └── ProductFilters.tsx
│   └── sync/
│       ├── SyncLog.tsx
│       ├── SyncConfig.tsx
│       └── SyncStatusBadge.tsx
├── lib/
│   ├── tiendanube/
│   │   ├── client.ts               # API client TN
│   │   ├── types.ts                # Tipos TN
│   │   └── transformers.ts         # Normalizar datos TN
│   ├── flexus/
│   │   ├── client.ts               # API client Flexus
│   │   ├── types.ts                # Tipos Flexus
│   │   └── transformers.ts         # Normalizar datos Flexus
│   ├── sync/
│   │   ├── stockSync.ts            # Lógica core de sync de stock
│   │   ├── priceSync.ts            # Lógica sync de precios
│   │   └── diffEngine.ts           # Motor de detección de diferencias
│   └── db/
│       └── index.ts                # Prisma Client singleton (Neon adapter)
├── prisma/
│   ├── schema.prisma               # Modelos Prisma (tablas en Neon)
│   └── migrations/                 # Migraciones SQL generadas por Prisma
├── hooks/
│   ├── useTiendaNube.ts
│   ├── useFlexus.ts
│   └── useSyncStatus.ts
├── types/
│   └── unified.ts                  # Tipos unificados (producto, stock, venta)
├── .env.local.example
├── vercel.json                     # Cron jobs para sync automático
└── package.json
```

---

## PASO 1 — SETUP DEL REPO

### 1.1 Inicializar proyecto Next.js

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```

### 1.2 Instalar dependencias

```bash
npm install \
  recharts \
  @tanstack/react-query \
  axios \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge \
  @prisma/client \
  @prisma/adapter-neon \
  @neondatabase/serverless \
  zod \
  nanoid

npm install -D prisma
```

### 1.3 Variables de entorno — crear `.env.local`

```env
# ─── TIENDA NUBE ───────────────────────────────────────────────
# Panel: tiendanube.com → Mis apps → Crear app de partners
# O bien: cuenta → Configuración → API → Generar token
TIENDANUBE_STORE_ID=7143771
TIENDANUBE_ACCESS_TOKEN=tu_access_token_aqui
TIENDANUBE_CLIENT_ID=tu_client_id
TIENDANUBE_CLIENT_SECRET=tu_client_secret

# ─── FLEXUS ────────────────────────────────────────────────────
# Pedí a soporte de Flexus las credenciales de API REST
# O configurá en Flexus: Configuración → Integraciones → API
FLEXUS_API_URL=https://api.flexus.com.ar/v1
FLEXUS_API_KEY=tu_api_key_flexus
FLEXUS_USERNAME=tu_usuario
FLEXUS_PASSWORD=tu_password

# ─── NEON (PostgreSQL serverless para persistencia) ────────────
# neon.tech → Create Project → Dashboard → Connection Details
# Copiar AMBAS connection strings:
DATABASE_URL=postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
# ↑ Pooled (con -pooler en el host) — usada en runtime serverless
DATABASE_URL_UNPOOLED=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
# ↑ Direct (sin pooler) — usada por Prisma Migrate

# ─── SYNC CONFIG ───────────────────────────────────────────────
SYNC_SECRET=una_clave_secreta_para_cron
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

---

## PASO 2 — TIPOS UNIFICADOS

### `types/unified.ts`
> Ambas APIs devuelven datos distintos. Este tipo es el "idioma común" del integrador.

```typescript
// El código de producto ES EL MISMO en TN y Flexus — clave del integrador
export interface UnifiedProduct {
  code: string           // VEM-XXXX — clave de sincronización
  name: string
  category: string
  stock: {
    tiendaNube: number
    flexus: number
    synced: boolean
    diff: number         // flexus - tiendaNube
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
}
```

---

## PASO 3 — CLIENT DE TIENDA NUBE

### Cómo obtener el token de Tienda Nube

**Opción A — Token personal (más rápido, para uso propio):**
1. Ir a `vematel.com.ar` panel admin
2. Configuración → Aplicaciones → Gestionar aplicaciones
3. "Crear aplicación" → tipo "Privada"
4. Permisos necesarios: `read_products`, `write_products`, `read_orders`, `write_orders`
5. Copiar `access_token` y `store_id`

**Opción B — OAuth app (si van a usar múltiples tiendas):**
Ver documentación: https://tiendanube.github.io/api-documentation/authentication

### `lib/tiendanube/client.ts`

```typescript
import axios, { AxiosInstance } from 'axios'

const BASE_URL = 'https://api.tiendanube.com/v1'

export function createTNClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BASE_URL}/${process.env.TIENDANUBE_STORE_ID}`,
    headers: {
      'Authentication': `bearer ${process.env.TIENDANUBE_ACCESS_TOKEN}`,
      'User-Agent': 'Vematel-Integrador/1.0 (info@vematel.com.ar)',
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })
}

// ─── PRODUCTOS ─────────────────────────────────────────────────
// GET /products → devuelve array paginado
// Cada producto tiene: id, name, variants[].sku, variants[].stock, price
export async function getTNProducts(page = 1) {
  const client = createTNClient()
  const { data } = await client.get('/products', {
    params: { page, per_page: 200, fields: 'id,name,variants,categories' }
  })
  return data // Array de productos
}

// Obtener TODOS los productos paginando
export async function getAllTNProducts() {
  let page = 1
  let all: TNProduct[] = []
  while (true) {
    const products = await getTNProducts(page)
    if (!products.length) break
    all = [...all, ...products]
    if (products.length < 200) break
    page++
  }
  return all
}

// ─── ACTUALIZAR STOCK EN TIENDA NUBE ──────────────────────────
// PUT /products/:id/variants/:variantId → actualiza stock
export async function updateTNStock(productId: number, variantId: number, stock: number) {
  const client = createTNClient()
  const { data } = await client.put(`/products/${productId}/variants/${variantId}`, {
    stock: stock
  })
  return data
}

// ─── PEDIDOS ──────────────────────────────────────────────────
export async function getTNOrders(since?: Date) {
  const client = createTNClient()
  const params: Record<string, unknown> = { per_page: 200 }
  if (since) params.created_at_min = since.toISOString()
  const { data } = await client.get('/orders', { params })
  return data
}

// ─── TIPOS TIENDA NUBE ─────────────────────────────────────────
export interface TNProduct {
  id: number
  name: { es: string }
  categories: Array<{ name: { es: string } }>
  variants: Array<{
    id: number
    sku: string           // ← este es el código VEM-XXXX
    stock: number | null  // null = sin límite de stock
    price: string
    compare_at_price: string | null
  }>
}
```

---

## PASO 4 — CLIENT DE FLEXUS

### Cómo conectar con Flexus

**Contactar a soporte de Flexus** (el sistema de gestión) para obtener:
- URL de la API REST (normalmente `https://api.flexus.com.ar/v1` o similar)
- API Key o usuario/contraseña
- Documentación de endpoints disponibles

**Endpoints que necesitás de Flexus:**
- `GET /products` o `GET /articulos` — listado con stock
- `GET /stock` — stock actual por código
- `GET /ventas` — historial de ventas
- `POST /stock/adjust` — ajustar stock (si la API lo permite)

### `lib/flexus/client.ts`

```typescript
import axios, { AxiosInstance } from 'axios'

// NOTA: Flexus puede usar autenticación básica o por token.
// Ajustar según la documentación que entregue el soporte de Flexus.
export function createFlexusClient(): AxiosInstance {
  const client = axios.create({
    baseURL: process.env.FLEXUS_API_URL,
    headers: {
      'X-Api-Key': process.env.FLEXUS_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
    // Si usa Basic Auth en vez de API key:
    // auth: {
    //   username: process.env.FLEXUS_USERNAME!,
    //   password: process.env.FLEXUS_PASSWORD!,
    // }
  })
  return client
}

// ─── PRODUCTOS / ARTÍCULOS ─────────────────────────────────────
// Flexus llama "artículos" a los productos, con campo "codigo" = VEM-XXXX
export async function getFlexusProducts() {
  const client = createFlexusClient()
  const { data } = await client.get('/articulos', {
    params: { activos: true, con_stock: true }
  })
  return data
}

// ─── STOCK POR CÓDIGO ──────────────────────────────────────────
export async function getFlexusStock(codigo?: string) {
  const client = createFlexusClient()
  const params = codigo ? { codigo } : {}
  const { data } = await client.get('/stock', { params })
  return data
}

// ─── VENTAS ────────────────────────────────────────────────────
export async function getFlexusSales(from: Date, to: Date) {
  const client = createFlexusClient()
  const { data } = await client.get('/ventas', {
    params: {
      fecha_desde: from.toISOString().split('T')[0],
      fecha_hasta: to.toISOString().split('T')[0],
    }
  })
  return data
}

// ─── ACTUALIZAR STOCK EN FLEXUS (si la API lo permite) ─────────
export async function updateFlexusStock(codigo: string, cantidad: number) {
  const client = createFlexusClient()
  const { data } = await client.post('/stock/ajuste', {
    codigo,
    cantidad,
    motivo: 'Sincronización Tienda Nube'
  })
  return data
}

// ─── TIPOS FLEXUS ──────────────────────────────────────────────
export interface FlexusArticulo {
  codigo: string      // ← VEM-XXXX — clave de sincronización
  descripcion: string
  categoria: string
  stock_actual: number
  precio_venta: number
  precio_costo: number
  activo: boolean
}

export interface FlexusVenta {
  id: number
  fecha: string
  articulos: Array<{
    codigo: string
    cantidad: number
    precio: number
    subtotal: number
  }>
  total: number
  cliente?: string
}
```

---

## PASO 5 — MOTOR DE SINCRONIZACIÓN DE STOCK

Este es el corazón del integrador.  
**Regla de negocio: Flexus es la fuente de verdad del stock.**  
Flexus gestiona el stock físico → el integrador lee Flexus → actualiza Tienda Nube.

### `lib/sync/stockSync.ts`

```typescript
import { getAllTNProducts, updateTNStock, TNProduct } from '@/lib/tiendanube/client'
import { getFlexusProducts, FlexusArticulo } from '@/lib/flexus/client'
import { saveSyncLog } from '@/lib/db/syncLog'
import { UnifiedProduct } from '@/types/unified'

export interface StockSyncResult {
  total: number
  updated: number
  skipped: number
  errors: number
  diffs: Array<{ code: string; tnStock: number; fxStock: number; diff: number }>
  duration: number
}

export async function syncStock(): Promise<StockSyncResult> {
  const startTime = Date.now()
  const result: StockSyncResult = { total: 0, updated: 0, skipped: 0, errors: 0, diffs: [] }

  try {
    // 1. Obtener datos de ambas fuentes en paralelo
    const [tnProducts, fxProducts] = await Promise.all([
      getAllTNProducts(),
      getFlexusProducts(),
    ])

    // 2. Crear mapa de Flexus: codigo → stock
    const fxMap = new Map<string, FlexusArticulo>()
    for (const art of fxProducts) {
      fxMap.set(art.codigo, art)
    }

    // 3. Crear mapa de TN: sku → { productId, variantId, stock }
    type TNVariantRef = { productId: number; variantId: number; stock: number }
    const tnMap = new Map<string, TNVariantRef>()
    for (const prod of tnProducts) {
      for (const variant of prod.variants) {
        if (variant.sku) {
          tnMap.set(variant.sku, {
            productId: prod.id,
            variantId: variant.id,
            stock: variant.stock ?? 0,
          })
        }
      }
    }

    result.total = tnMap.size

    // 4. Comparar y actualizar
    for (const [codigo, fxArt] of fxMap) {
      const tnRef = tnMap.get(codigo)
      if (!tnRef) continue // Producto existe en Flexus pero no en TN — ignorar

      const fxStock = fxArt.stock_actual
      const tnStock = tnRef.stock
      const diff = fxStock - tnStock

      if (diff === 0) {
        result.skipped++
        continue
      }

      // Diferencia detectada — registrar
      result.diffs.push({ code: codigo, tnStock, fxStock, diff })

      // Actualizar TN con el stock de Flexus
      try {
        await updateTNStock(tnRef.productId, tnRef.variantId, fxStock)
        result.updated++
      } catch (err) {
        result.errors++
        console.error(`Error actualizando ${codigo}:`, err)
      }

      // Rate limit TN: máximo 2 req/seg → esperar 600ms entre updates
      await sleep(600)
    }

    result.duration = Date.now() - startTime

    // 5. Guardar log en KV
    await saveSyncLog({
      type: 'stock',
      status: result.errors > 0 ? 'warning' : 'ok',
      message: `Sync completada: ${result.updated} actualizados, ${result.errors} errores`,
      productsAffected: result.updated,
      details: result,
    })

    return result

  } catch (err) {
    await saveSyncLog({
      type: 'stock',
      status: 'error',
      message: `Error crítico en sync: ${(err as Error).message}`,
    })
    throw err
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
```

---

## PASO 6 — MOTOR DE DIFERENCIAS

### `lib/sync/diffEngine.ts`

```typescript
import { UnifiedProduct } from '@/types/unified'

export interface StockDiff {
  code: string
  name: string
  tnStock: number
  fxStock: number
  diff: number
  severity: 'low' | 'medium' | 'high'  // basado en % de diferencia
}

export function detectStockDiffs(products: UnifiedProduct[]): StockDiff[] {
  return products
    .filter(p => !p.stock.synced)
    .map(p => {
      const diff = p.stock.flexus - p.stock.tiendaNube
      const pct = p.stock.flexus > 0 ? Math.abs(diff) / p.stock.flexus : 1
      return {
        code: p.code,
        name: p.name,
        tnStock: p.stock.tiendaNube,
        fxStock: p.stock.flexus,
        diff,
        severity: pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low',
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
      pctDiff: ((p.price.tiendaNube - p.price.flexus) / p.price.flexus) * 100,
    }))
}
```

---

## PASO 7 — API ROUTES

### `app/api/sync/stock/route.ts` — Endpoint que ejecuta la sync

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { syncStock } from '@/lib/sync/stockSync'

// Este endpoint es llamado por el cron job de Vercel
// También se puede llamar manualmente desde el dashboard
export async function POST(req: NextRequest) {
  // Verificar secret para llamadas de cron
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncStock()
    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
```

### `app/api/tiendanube/products/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getAllTNProducts } from '@/lib/tiendanube/client'

// Caché con Next.js revalidation — no necesitamos KV para esto
// next: { revalidate: 300 } = 5 minutos de caché en el edge
export const revalidate = 300

export async function GET() {
  const products = await getAllTNProducts()
  return NextResponse.json(products)
}
```

### `app/api/tiendanube/webhooks/route.ts` — Recibir eventos de TN

```typescript
import { NextRequest, NextResponse } from 'next/server'
// Cuando se hace una venta en TN, este webhook la recibe
// y puede actualizar el stock en Flexus (si la API de Flexus lo permite)
export async function POST(req: NextRequest) {
  const event = await req.json()

  // event.event puede ser: order/created, order/paid, product/updated, etc.
  if (event.event === 'order/paid') {
    // Restar stock de los productos vendidos en Flexus
    for (const item of event.order.products) {
      // item.sku = VEM-XXXX
      // await updateFlexusStock(item.sku, -item.quantity)
      console.log(`Venta TN: ${item.sku} x${item.quantity}`)
    }
  }

  return NextResponse.json({ ok: true })
}
```

---

## PASO 8 — CRON JOB EN VERCEL

### `vercel.json` — Sync automática cada 5 minutos

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

> **Nota:** Los cron jobs de Vercel requieren plan Pro. En plan hobby, usar un servicio externo tipo cron-job.org apuntando al mismo endpoint con el header `x-sync-secret`.

---

## PASO 9 — COMPONENTES DEL DASHBOARD

### `components/layout/Sidebar.tsx`

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, TrendingUp, ShoppingBag, RefreshCw, Settings } from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/stock',      label: 'Stock Unificado',  icon: Package },
  { href: '/ventas',     label: 'Ventas',           icon: TrendingUp },
  { href: '/productos',  label: 'Productos',        icon: ShoppingBag },
  { href: '/sync',       label: 'Sync & Logs',      icon: RefreshCw },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 bg-white border-r border-gray-100 h-screen fixed flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">V</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Vematel</div>
            <div className="text-xs text-gray-400">Integrador</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
              ${path === href
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          TN + Flexus conectados
        </div>
      </div>
    </aside>
  )
}
```

### `components/dashboard/MetricCard.tsx`

```typescript
interface Props {
  label: string
  value: string
  delta?: string
  deltaType?: 'up' | 'down'
  sub?: string
  accent?: 'blue' | 'amber' | 'green' | 'purple'
}

export function MetricCard({ label, value, delta, deltaType, sub, accent = 'blue' }: Props) {
  const accentBar = {
    blue: 'bg-blue-500', amber: 'bg-amber-400',
    green: 'bg-emerald-500', purple: 'bg-violet-500'
  }[accent]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentBar}`} />
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-semibold tracking-tight leading-none mb-1">{value}</div>
      {(delta || sub) && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          {delta && (
            <span className={deltaType === 'up' ? 'text-emerald-500' : 'text-red-500'}>
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

### `components/dashboard/SalesChart.tsx`

```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ date: string; tn: number; fx: number }>
}

export function SalesChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
          tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
        <Tooltip
          formatter={(v: number) => [`$${v.toLocaleString('es-AR')}`, '']}
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="tn" fill="#3B82F6" radius={[3,3,0,0]} name="Tienda Nube" />
        <Bar dataKey="fx" fill="#F59E0B" radius={[3,3,0,0]} name="Flexus" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## PASO 10 — PÁGINAS PRINCIPALES

### `app/dashboard/page.tsx`

```typescript
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { KpiComparison } from '@/components/dashboard/KpiComparison'
import { TopProducts } from '@/components/dashboard/TopProducts'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { getDashboardData } from '@/lib/data/dashboard'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-400">Resumen unificado Tienda Nube + Flexus</p>
      </div>

      {data.stockDiffs > 0 && (
        <AlertBanner
          message={`${data.stockDiffs} productos con stock desincronizado`}
          type="warning"
        />
      )}

      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Ventas TN — Mes" value={`$${(data.salesTN/1000).toFixed(0)}K`}
          delta="14%" deltaType="up" sub="vs mes anterior" accent="blue" />
        <MetricCard label="Ventas Flexus — Mes" value={`$${(data.salesFX/1000).toFixed(0)}K`}
          delta="8%" deltaType="up" sub="vs mes anterior" accent="amber" />
        <MetricCard label="Total combinado" value={`$${((data.salesTN+data.salesFX)/1000).toFixed(0)}K`}
          delta="10.5%" deltaType="up" accent="green" />
        <MetricCard label="Productos sync" value={data.productsSynced.toLocaleString()}
          sub={`${data.stockDiffs} con desvío`} accent="purple" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Ventas por canal — Últimos 7 días</div>
          <SalesChart data={data.salesTimeline} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">KPI Comparativo</div>
          <KpiComparison metrics={data} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TopProducts products={data.topProducts} />
        <CategoryDonut data={data.salesByCategory} />
        {/* SyncLog mini */}
      </div>
    </div>
  )
}
```

### `app/stock/page.tsx`

```typescript
import { StockDiffTable } from '@/components/stock/StockDiffTable'
import { StockByCategory } from '@/components/stock/StockByCategory'
import { SyncButton } from '@/components/stock/SyncButton'
import { getUnifiedStock } from '@/lib/data/stock'

export default async function StockPage() {
  const { products, diffs, summary } = await getUnifiedStock()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Stock Unificado</h1>
          <p className="text-sm text-gray-400">Flexus es la fuente de verdad — TN se actualiza desde Flexus</p>
        </div>
        <SyncButton />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Stock total TN" value={`${summary.totalTN.toLocaleString()} u.`} accent="blue" />
        <MetricCard label="Stock total Flexus" value={`${summary.totalFX.toLocaleString()} u.`} accent="amber" />
        <MetricCard label="Sincronizados" value={summary.synced.toString()}
          sub={`${((summary.synced/summary.total)*100).toFixed(1)}% del total`} accent="green" />
        <MetricCard label="Con desvío" value={diffs.length.toString()} accent="purple" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Diferencias detectadas</div>
          <StockDiffTable diffs={diffs} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-sm font-medium mb-3">Stock por categoría</div>
          <StockByCategory products={products} />
        </div>
      </div>
    </div>
  )
}
```

---

## PASO 11 — PERSISTENCIA CON NEON + PRISMA

### `prisma/schema.prisma` — Modelos Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  // Neon requiere directUrl para migraciones (sin pooler)
  directUrl = env("DATABASE_URL_UNPOOLED")
}

model SyncLog {
  id               String    @id @default(cuid())
  timestamp        DateTime  @default(now())
  type             SyncType
  status           SyncStatus
  message          String
  productsAffected Int?
  details          Json?

  @@map("sync_logs")
}

model StockSnapshot {
  id          String   @id @default(cuid())
  capturedAt  DateTime @default(now())
  productCode String
  stockTn     Int
  stockFx     Int
  diff        Int

  @@map("stock_snapshots")
}

enum SyncType {
  stock
  price
  order
  full
}

enum SyncStatus {
  ok
  warning
  error
}
```

> **Setup de Neon + Prisma:**
> 1. Crear cuenta en [neon.tech](https://neon.tech)
> 2. New Project → copiar ambas connection strings:
>    - **Pooled** (puerto 5432 con `-pooler`) → `DATABASE_URL`
>    - **Direct** (sin pooler) → `DATABASE_URL_UNPOOLED`
> 3. Inicializar Prisma: `npx prisma init`
> 4. Reemplazar `prisma/schema.prisma` con el schema de arriba
> 5. Correr migraciones: `npx prisma migrate dev --name init`
> 6. Generar cliente: `npx prisma generate`

### `lib/db/index.ts` — Prisma Client singleton (con Neon adapter)

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

// Singleton para evitar múltiples conexiones en desarrollo con hot reload
const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const sql = neon(process.env.DATABASE_URL!)
  const adapter = new PrismaNeon(sql)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### `lib/db/syncLog.ts`

```typescript
import { prisma } from './index'
import { SyncLog } from '@/types/unified'

export async function saveSyncLog(log: Omit<SyncLog, 'id' | 'timestamp'>): Promise<SyncLog> {
  const entry = await prisma.syncLog.create({
    data: {
      type: log.type,
      status: log.status,
      message: log.message,
      productsAffected: log.productsAffected ?? null,
      details: log.details ?? undefined,
    },
  })
  return entry as unknown as SyncLog
}

export async function getSyncLogs(limit = 50): Promise<SyncLog[]> {
  const rows = await prisma.syncLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
  return rows as unknown as SyncLog[]
}

export async function getLastSyncTime(): Promise<Date | null> {
  const row = await prisma.syncLog.findFirst({
    where: { status: 'ok' },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  })
  return row?.timestamp ?? null
}
```

---

## PASO 12 — FLUJO COMPLETO DE SINCRONIZACIÓN

```
FLEXUS (fuente de verdad)
     │
     │  1. Cron job cada 5 min llama POST /api/sync/stock
     │
     ▼
lib/sync/stockSync.ts
     │
     │  2. getAllTNProducts()   ← API Tienda Nube
     │  3. getFlexusProducts()  ← API Flexus
     │
     │  4. diffEngine.detectStockDiffs()
     │     Compara por código VEM-XXXX
     │
     │  5. Para cada diferencia:
     │     updateTNStock(productId, variantId, fxStock)
     │     ← PUT /products/:id/variants/:variantId
     │     ← rate limit: 600ms entre requests
     │
     │  6. saveSyncLog() → Vercel KV
     │
     ▼
TIENDA NUBE (actualizada)

─── FLUJO INVERSO (venta en TN → Flexus) ───────────────────────
TIENDA NUBE webhook → POST /api/tiendanube/webhooks
     │
     │  event: order/paid
     │  products: [{ sku: 'VEM-XXXX', quantity: 2 }]
     │
     ▼
updateFlexusStock('VEM-XXXX', -2)
     │
     ▼
FLEXUS (stock descontado)
```

---

## PASO 13 — DESPLIEGUE EN VERCEL

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Linkear con el repo
vercel link

# 4. Crear base de datos en Neon y correr migraciones
# neon.tech → New Project → copiar ambas connection strings
# Agregar al .env.local y correr:
npx prisma migrate deploy   # aplica migraciones en Neon

# 5. Subir variables de entorno a Vercel
vercel env add TIENDANUBE_STORE_ID
vercel env add TIENDANUBE_ACCESS_TOKEN
vercel env add FLEXUS_API_URL
vercel env add FLEXUS_API_KEY
vercel env add SYNC_SECRET
vercel env add DATABASE_URL           # ← pooled (runtime)
vercel env add DATABASE_URL_UNPOOLED  # ← direct (prisma migrate)

# 6. Deploy
vercel deploy --prod
```

---

## PASO 14 — ORDEN DE IMPLEMENTACIÓN PARA CLAUDE CODE

Ejecutar en este orden exacto:

```
1.  Setup inicial (Paso 1) — crear-next-app + instalar deps
2.  Crear types/unified.ts (Paso 2)
3.  Correr: npx prisma init → genera prisma/schema.prisma y .env
4.  Reemplazar prisma/schema.prisma con el schema de Paso 11
5.  Correr: npx prisma migrate dev --name init → crea tablas en Neon
6.  Correr: npx prisma generate → genera el cliente tipado
7.  Crear lib/db/index.ts — Prisma Client singleton con Neon adapter
8.  Crear lib/db/syncLog.ts (Paso 11)
9.  Crear lib/tiendanube/client.ts (Paso 3)
9.  Crear lib/flexus/client.ts (Paso 4)
10. Crear lib/sync/diffEngine.ts (Paso 6)
11. Crear lib/sync/stockSync.ts (Paso 5)
12. Crear app/api/sync/stock/route.ts (Paso 7)
13. Crear app/api/tiendanube/products/route.ts
14. Crear app/api/tiendanube/webhooks/route.ts
15. Crear app/api/flexus/products/route.ts
16. Crear app/layout.tsx con Sidebar
17. Crear components/layout/Sidebar.tsx (Paso 9)
18. Crear components/layout/TopBar.tsx
19. Crear components/dashboard/MetricCard.tsx
20. Crear components/dashboard/SalesChart.tsx (Recharts)
21. Crear components/dashboard/KpiComparison.tsx
22. Crear components/dashboard/CategoryDonut.tsx
23. Crear components/dashboard/TopProducts.tsx
24. Crear components/dashboard/AlertBanner.tsx
25. Crear components/stock/StockDiffTable.tsx
26. Crear components/stock/StockByCategory.tsx
27. Crear components/stock/SyncButton.tsx (client component con fetch)
28. Crear components/ventas/SalesTimeline.tsx
29. Crear components/ventas/ChannelMix.tsx
30. Crear components/productos/ProductTable.tsx
31. Crear components/productos/ProductFilters.tsx
32. Crear components/sync/SyncLog.tsx
33. Crear components/sync/SyncConfig.tsx
34. Crear lib/data/dashboard.ts (agrega datos de TN + FX para la página)
35. Crear lib/data/stock.ts
36. Crear lib/data/sales.ts
37. Crear app/dashboard/page.tsx (Paso 10)
38. Crear app/stock/page.tsx
39. Crear app/ventas/page.tsx
40. Crear app/productos/page.tsx
41. Crear app/sync/page.tsx
42. Crear vercel.json con crons (Paso 8)
43. Crear .env.local.example con todas las variables
44. Deploy a Vercel (Paso 13)
```

---

## NOTAS IMPORTANTES PARA CLAUDE CODE

### Rate Limits de Tienda Nube
- **2 requests por segundo** máximo
- Usar `sleep(600)` entre requests cuando se actualizan stocks en lote
- Implementar retry con backoff exponencial para errores 429

### Código de producto como clave de sync
```
TN:  variant.sku     = "VEM-4821"
FX:  articulo.codigo = "VEM-4821"
```
Ambos sistemas usan el mismo código → es la clave de sincronización.
Si no matchean → el producto está en uno solo → no sincronizar, registrar warning.

### Flexus API — si no tiene API REST
Si Flexus no tiene API REST documentada, alternativas:
1. Exportar CSV/Excel desde Flexus periódicamente → importar al integrador
2. Usar la base de datos directamente si está en el mismo servidor
3. Contactar a soporte de Flexus para habilitar la API

### Webhooks de Tienda Nube
Registrar webhooks en TN para recibir eventos en tiempo real:
```
POST https://api.tiendanube.com/v1/{store_id}/webhooks
{
  "event": "order/paid",
  "url": "https://tu-app.vercel.app/api/tiendanube/webhooks"
}
```
Eventos relevantes: `order/paid`, `order/fulfilled`, `product/updated`
```

---

*Generado para Vematel — Sistema de iluminación, electricidad y herramientas, Córdoba AR*
