import axios, { AxiosInstance } from 'axios'

export interface FlexusArticulo {
  codigo: string
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

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: process.env.FLEXUS_API_URL,
    headers: {
      'X-Api-Key': process.env.FLEXUS_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  })
}

export async function getFlexusProducts(): Promise<FlexusArticulo[]> {
  const client = createClient()
  const { data } = await client.get('/articulos', {
    params: { activos: true, con_stock: true },
  })
  return data
}

export async function getFlexusStock(codigo?: string): Promise<FlexusArticulo[]> {
  const client = createClient()
  const params = codigo ? { codigo } : {}
  const { data } = await client.get('/stock', { params })
  return data
}

export async function getFlexusSales(from: Date, to: Date): Promise<FlexusVenta[]> {
  const client = createClient()
  const { data } = await client.get('/ventas', {
    params: {
      fecha_desde: from.toISOString().split('T')[0],
      fecha_hasta: to.toISOString().split('T')[0],
    },
  })
  return data
}

export async function updateFlexusStock(codigo: string, cantidad: number): Promise<void> {
  const client = createClient()
  await client.post('/stock/ajuste', {
    codigo,
    cantidad,
    motivo: 'Sincronización Tienda Nube',
  })
}
