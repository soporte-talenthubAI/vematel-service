import { NextResponse } from 'next/server'
import axios from 'axios'

// GET /api/tiendanube/test — verifica que las credenciales de TN funcionan
export async function GET() {
  const storeId = process.env.TIENDANUBE_STORE_ID
  const token = process.env.TIENDANUBE_ACCESS_TOKEN

  if (!storeId || !token) {
    return NextResponse.json(
      { ok: false, error: 'Faltan TIENDANUBE_STORE_ID o TIENDANUBE_ACCESS_TOKEN en .env.local' },
      { status: 400 },
    )
  }

  try {
    const { data } = await axios.get(
      `https://api.tiendanube.com/v1/${storeId}/products`,
      {
        params: { per_page: 1, fields: 'id,name' },
        headers: {
          Authentication: `bearer ${token}`,
          'User-Agent': 'Vematel-Integrador/1.0 (info@vematel.com.ar)',
        },
        timeout: 8000,
      },
    )

    return NextResponse.json({
      ok: true,
      storeId,
      primerProducto: Array.isArray(data) && data[0]
        ? { id: data[0].id, nombre: data[0].name?.es ?? data[0].name }
        : null,
      mensaje: 'Conexión con Tienda Nube exitosa',
    })
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      const msg =
        status === 401 ? 'Token inválido o expirado — revisá TIENDANUBE_ACCESS_TOKEN'
        : status === 404 ? 'Store ID no encontrado — revisá TIENDANUBE_STORE_ID'
        : `Error HTTP ${status}: ${JSON.stringify(err.response?.data)}`
      return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
