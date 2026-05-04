import { NextResponse } from 'next/server'
import { getFlexusProducts } from '@/lib/flexus/client'

export const revalidate = 300

export async function GET() {
  try {
    const products = await getFlexusProducts()
    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
