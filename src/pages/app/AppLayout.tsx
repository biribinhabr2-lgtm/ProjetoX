import { Outlet, NavLink } from 'react-router-dom'
import { Calendar, Users, FileText, DollarSign, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/app/agenda', label: 'Agenda', icon: Calendar },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/app/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
]

export default function AppLayout() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b font-bold text-lg">FestaHub</div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
