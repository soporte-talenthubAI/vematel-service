import { NextResponse } from 'next/server'
import { getAllTNProducts } from '@/lib/tiendanube/client'

export const revalidate = 300

export async function GET() {
  try {
    const products = await getAllTNProducts()
    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
