'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  ShoppingBag,
  RefreshCw,
  Users,
  LogOut,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock Unificado', icon: Package },
  { href: '/ventas', label: 'Ventas', icon: TrendingUp },
  { href: '/productos', label: 'Productos', icon: ShoppingBag },
  { href: '/sync', label: 'Sync & Logs', icon: RefreshCw },
]

const ADMIN_NAV = [
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-100 h-screen fixed flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">V</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Vematel</div>
            <div className="text-xs text-gray-400">Integrador</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
              ${
                path === href
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}

        <div className="pt-3 pb-1">
          <div className="text-xs font-medium text-gray-300 px-3 pb-1 uppercase tracking-wide">Admin</div>
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                ${
                  path.startsWith(href)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          TN conectado
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
