import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SessionProvider } from '@/lib/auth/session-provider'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Vematel Integrador',
  description: 'Dashboard unificado Tienda Nube + Flexus',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`} style={{ colorScheme: 'light' }}>
      <body className="h-full bg-gray-50 text-gray-900">
        <SessionProvider>
          <Sidebar />
          <div className="ml-56 flex flex-col min-h-screen">
            <TopBar title="Vematel Integrador" />
            <main className="flex-1">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
