import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Vematel Integrador',
  description: 'Dashboard unificado Tienda Nube + Flexus',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 text-gray-900">
        <Sidebar />
        <main className="ml-56 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
