import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Users,
  FileText,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  PartyPopper,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/services/auth'

const navItems = [
  { to: '/app/agenda',       label: 'Agenda',        icon: Calendar  },
  { to: '/app/clientes',     label: 'Clientes',      icon: Users     },
  { to: '/app/orcamentos',   label: 'Orçamentos',    icon: FileText  },
  { to: '/app/financeiro',   label: 'Financeiro',    icon: DollarSign},
  { to: '/app/configuracoes',label: 'Configurações', icon: Settings  },
]

// ─── Sidebar ────────────────────────────────────────────────
interface SidebarProps {
  onClose?: () => void
}

function Sidebar({ onClose }: SidebarProps) {
  const organization = useAuthStore((s) => s.organization)

  return (
    <div className="flex h-full flex-col">
      {/* Logo / nome da org */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <PartyPopper className="h-5 w-5 text-primary" />
        <span className="truncate font-semibold text-sm">
          {organization?.name ?? 'FestaHub'}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 hover:bg-accent"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// ─── UserMenu ────────────────────────────────────────────────
function UserMenu() {
  const navigate = useNavigate()
  const { profile, organization, clear } = useAuthStore()

  async function handleSignOut() {
    try {
      await signOut()
      clear()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="max-w-[140px] truncate text-sm">
            {profile?.full_name ?? organization?.name ?? 'Minha conta'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="truncate text-xs font-medium">{organization?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.full_name}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── AppLayout (root) ────────────────────────────────────────
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 border-r bg-card md:flex md:flex-col">
        <Sidebar />
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center border-b bg-card px-4">
          <button
            className="mr-3 rounded-md p-1.5 hover:bg-accent md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Espaço flexível */}
          <div className="flex-1" />

          <UserMenu />
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
