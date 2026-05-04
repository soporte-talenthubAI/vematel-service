import { NextRequest, NextResponse } from 'next/server'
import { getFlexusStock } from '@/lib/flexus/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const codigo = searchParams.get('codigo') ?? undefined

  try {
    const stock = await getFlexusStock(codigo)
    return NextResponse.json(stock)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
