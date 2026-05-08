@AGENTS.md

---

# ESTADO ACTUAL DEL PROYECTO (2026-05-08)

## QUÉ ESTÁ IMPLEMENTADO

La app está **casi completamente construida**. Toda la estructura, páginas, componentes y lógica de backend están presentes:

- **Todas las páginas:** `/dashboard`, `/stock`, `/ventas`, `/productos`, `/sync`
- **Todos los componentes:** MetricCard, SalesChart, KpiComparison, AlertBanner, CategoryDonut, TopProducts, StockDiffTable, StockByCategory, SyncButton, SalesTimeline, ChannelMix, ProductTable, ProductFilters, SyncLog, SyncConfig, Sidebar, TopBar
- **Clientes de API:** `lib/tiendanube/client.ts` y `lib/flexus/client.ts`
- **Motor de sync:** `lib/sync/stockSync.ts` + `lib/sync/diffEngine.ts`
- **Persistencia:** Prisma + Neon (`lib/db/index.ts`, `lib/db/syncLog.ts`)
- **API Routes:** `/api/sync/stock` (cron), `/api/sync/manual` (dashboard), `/api/sync/status`, `/api/tiendanube/products`, `/api/tiendanube/webhooks`, `/api/flexus/products`, `/api/flexus/stock`

## CREDENCIALES PENDIENTES (`.env.local`)

El archivo `.env.local` existe pero faltan los valores reales:

### Tienda Nube
- `TIENDANUBE_STORE_ID=7143771` ← ya está configurado
- `TIENDANUBE_ACCESS_TOKEN=` ← **PENDIENTE**
  - Obtener en: vematel.com.ar → Configuración → Aplicaciones → [crear app privada]
  - Permisos necesarios: `read_products`, `write_products`, `read_orders`

### Flexus
- `FLEXUS_API_URL=` ← URL de la API REST de Flexus
- `FLEXUS_API_KEY=` ← API Key de Flexus
  - Solicitar a soporte de Flexus: endpoint base + credenciales

### Neon (base de datos)
- `DATABASE_URL=` ← conexión pooled (con -pooler) para runtime
- `DATABASE_URL_UNPOOLED=` ← conexión directa para `prisma migrate`
  - Obtener en: neon.tech → tu proyecto → Connection Details

### Sync
- `SYNC_SECRET=` ← string aleatorio para proteger el endpoint del cron

## PASOS PARA PONER EN MARCHA

```bash
# 1. Instalar dependencias
npm install

# 2. Completar .env.local con las credenciales reales

# 3. Generar el cliente de Prisma
npx prisma generate

# 4. Correr migraciones en Neon
npx prisma migrate deploy

# 5. Levantar en desarrollo
npm run dev
```

## REGLAS DE NEGOCIO CRÍTICAS

- **Flexus es la fuente de verdad del stock.** TN siempre se actualiza desde Flexus, nunca al revés.
- **Clave de sync:** `variant.sku` en TN === `articulo.codigo` en Flexus (formato VEM-XXXX)
- **Rate limit TN:** 2 requests/seg máximo → `sleep(600ms)` entre PUTs en lote
- **`/api/sync/stock`** requiere header `x-sync-secret` (para cron de Vercel)
- **`/api/sync/manual`** no requiere secret (para el botón del dashboard)

## FIXES APLICADOS EN LA ÚLTIMA SESIÓN

1. Creado `/app/api/sync/manual/route.ts` — endpoint sin auth para el botón del dashboard
2. `SyncButton.tsx` y `TopBar.tsx` actualizados para usar `/api/sync/manual`
3. `lib/data/dashboard.ts` — corregido `salesTimeline` para agregar ventas reales por día
4. Creado `.env.local` con `TIENDANUBE_STORE_ID=7143771` ya completado

## FLUJO DE SINCRONIZACIÓN

```
FLEXUS (fuente de verdad)
  → POST /api/sync/stock (cron cada 5 min con x-sync-secret)
  → lib/sync/stockSync.ts
      → getAllTNProducts() + getAllFlexusProducts() en paralelo
      → buildUnifiedProducts() → matchea por VEM-XXXX
      → detectStockDiffs() → lista diferencias
      → updateTNStock() para cada diff (sleep 600ms entre requests)
      → saveSyncLog() → Neon DB
```
