import axios, { AxiosInstance } from 'axios'

const BASE_URL = 'https://api.tiendanube.com/v1'

export interface TNProduct {
  id: number
  name: { es: string }
  categories: Array<{ name: { es: string } }>
  variants: Array<{
    id: number
    sku: string
    stock: number | null
    price: string
    compare_at_price: string | null
  }>
}

export interface TNOrder {
  id: number
  number: number
  created_at: string
  status: string
  payment_status: string
  products: Array<{
    product_id: number
    variant_id: number
    sku: string
    quantity: number
    price: string
    name: string
  }>
  total: string
  customer?: { name: string; email: string }
}

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BASE_URL}/${process.env.TIENDANUBE_STORE_ID}`,
    headers: {
      Authentication: `bearer ${process.env.TIENDANUBE_ACCESS_TOKEN}`,
      'User-Agent': 'Vematel-Integrador/1.0 (soporte@talenthubai.com.ar)',
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function getTNProducts(page = 1): Promise<TNProduct[]> {
  const client = createClient()
  const { data } = await client.get('/products', {
    params: { page, per_page: 200, fields: 'id,name,variants,categories' },
  })
  return data
}

export async function getAllTNProducts(): Promise<TNProduct[]> {
  let page = 1
  const all: TNProduct[] = []
  while (true) {
    const products = await getTNProducts(page)
    if (!products.length) break
    all.push(...products)
    if (products.length < 200) break
    page++
    await sleep(600)
  }
  return all
}

export async function updateTNStock(
  productId: number,
  variantId: number,
  stock: number,
): Promise<void> {
  const client = createClient()
  await client.put(`/products/${productId}/variants/${variantId}`, { stock })
}

// Trae pedidos pagados. Por defecto últimos 30 días.
export async function getTNOrders(since?: Date, page = 1): Promise<TNOrder[]> {
  const client = createClient()
  const params: Record<string, unknown> = {
    per_page: 200,
    page,
    payment_status: 'paid',
  }
  if (since) params.created_at_min = since.toISOString()
  const { data } = await client.get('/orders', { params })
  return data
}

// Trae TODOS los pedidos pagados paginando
export async function getAllTNOrders(since?: Date): Promise<TNOrder[]> {
  let page = 1
  const all: TNOrder[] = []
  while (true) {
    const orders = await getTNOrders(since, page)
    if (!orders.length) break
    all.push(...orders)
    if (orders.length < 200) break
    page++
    await sleep(600)
  }
  return all
}

export async function registerWebhook(event: string, url: string): Promise<void> {
  const client = createClient()
  await client.post('/webhooks', { event, url })
}
