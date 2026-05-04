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
  created_at: string
  status: string
  payment_status: string
  products: Array<{
    sku: string
    quantity: number
    price: string
    name: string
  }>
  total: string
  customer?: { name: string }
}

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BASE_URL}/${process.env.TIENDANUBE_STORE_ID}`,
    headers: {
      Authentication: `bearer ${process.env.TIENDANUBE_ACCESS_TOKEN}`,
      'User-Agent': 'Vematel-Integrador/1.0 (info@vematel.com.ar)',
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })
}

export async function getTNProducts(page = 1): Promise<TNProduct[]> {
  const client = createClient()
  const { data } = await client.get('/products', {
    params: { page, per_page: 200, fields: 'id,name,variants,categories' },
  })
  return data
}

export async function getAllTNProducts(): Promise<TNProduct[]> {
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

export async function updateTNStock(
  productId: number,
  variantId: number,
  stock: number,
): Promise<void> {
  const client = createClient()
  await client.put(`/products/${productId}/variants/${variantId}`, { stock })
}

export async function getTNOrders(since?: Date): Promise<TNOrder[]> {
  const client = createClient()
  const params: Record<string, unknown> = { per_page: 200 }
  if (since) params.created_at_min = since.toISOString()
  const { data } = await client.get('/orders', { params })
  return data
}

export async function registerWebhook(event: string, url: string): Promise<void> {
  const client = createClient()
  await client.post('/webhooks', { event, url })
}
