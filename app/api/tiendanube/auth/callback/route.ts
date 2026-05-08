import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// GET /api/tiendanube/auth/callback?code=XXX
// TN redirige acá después de que el dueño de la tienda autoriza la app.
// Intercambia el code por el access_token y lo muestra en pantalla.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return htmlResponse('Error', 'No llegó el código de autorización desde Tienda Nube.', true)
  }

  const clientId = process.env.TIENDANUBE_CLIENT_ID
  const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return htmlResponse(
      'Error de configuración',
      'Faltan TIENDANUBE_CLIENT_ID o TIENDANUBE_CLIENT_SECRET en las variables de entorno.',
      true,
    )
  }

  try {
    const { data } = await axios.post(
      'https://www.tiendanube.com/apps/authorize/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      },
      { headers: { 'Content-Type': 'application/json' } },
    )

    // data.access_token = el token que va en .env.local
    // data.user_id      = el store_id (debería ser 7143771)
    return htmlResponse(
      'Conexión exitosa',
      `
        <p>Copiá estos valores y agregalos a tus variables de entorno en Vercel:</p>
        <div class="field">
          <label>TIENDANUBE_STORE_ID</label>
          <code>${data.user_id}</code>
        </div>
        <div class="field">
          <label>TIENDANUBE_ACCESS_TOKEN</label>
          <code style="word-break:break-all">${data.access_token}</code>
        </div>
        <p class="note">Una vez que los agregues en Vercel → Settings → Environment Variables, hacé un redeploy.</p>
      `,
      false,
    )
  } catch (err) {
    const msg = axios.isAxiosError(err)
      ? `Error de TN: ${JSON.stringify(err.response?.data)}`
      : (err as Error).message
    return htmlResponse('Error al obtener el token', msg, true)
  }
}

function htmlResponse(title: string, body: string, isError: boolean) {
  const color = isError ? '#dc2626' : '#16a34a'
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>TN Auth — ${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; color: #111; }
    h1 { color: ${color}; font-size: 1.4rem; }
    .field { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    label { display: block; font-size: 0.75rem; font-weight: 600; color: #6b7280; margin-bottom: 6px; }
    code { font-size: 0.9rem; color: #1d4ed8; }
    .note { font-size: 0.85rem; color: #6b7280; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
    status: isError ? 400 : 200,
  })
}
