import { NextResponse } from 'next/server'

// GET /api/tiendanube/auth — inicia el flujo OAuth con Tienda Nube
// Redirige al panel de TN para que el dueño de la tienda autorice la app
export async function GET() {
  const clientId = process.env.TIENDANUBE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: 'Falta TIENDANUBE_CLIENT_ID en .env.local' },
      { status: 400 },
    )
  }

  const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize`
  return NextResponse.redirect(authUrl)
}
