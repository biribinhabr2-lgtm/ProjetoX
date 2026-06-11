import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  AlertTriangle,
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
import { usePlan } from '@/hooks/usePlan'

const navItems = [
  { to: '/app/agenda',        label: 'Agenda',        icon: Calendar   },
  { to: '/app/clientes',      label: 'Clientes',      icon: Users      },
  { to: '/app/orcamentos',    label: 'Orçamentos',    icon: FileText   },
  { to: '/app/financeiro',    label: 'Financeiro',    icon: DollarSign },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings   },
]

// ─── Logo mark SVG ───────────────────────────────────────────
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#E8462A" />
      {/* Simplified balloon icon */}
      <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
      <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
    </svg>
  )
}

// ─── Avatar inicial ─────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
    >
      {initial}
    </div>
  )
}

// ─── SidebarPlanBadge ────────────────────────────────────────
function SidebarPlanBadge() {
  const navigate = useNavigate()
  const { plan, isTrial, trialDaysLeft, isActive } = usePlan()

  if (!isTrial && isActive) return null

  const bg = isActive
    ? 'rgba(232, 70, 42, 0.12)'
    : 'rgba(220, 38, 38, 0.12)'
  const border = isActive
    ? '1px solid rgba(232, 70, 42, 0.2)'
    : '1px solid rgba(220, 38, 38, 0.2)'
  const textColor = isActive ? 'var(--color-primary)' : 'var(--color-destructive)'
  const label = isTrial && isActive
    ? `Trial — ${trialDaysLeft}d restante${trialDaysLeft !== 1 ? 's' : ''}`
    : plan === 'trial'
    ? 'Trial expirado'
    : 'Assinatura inativa'

  return (
    <div className="px-3 pb-4">
      <button
        onClick={() => navigate('/app/configuracoes')}
        className="w-full rounded-lg px-3 py-2.5 text-left transition-opacity hover:opacity-80"
        style={{ background: bg, border }}
      >
        <p className="text-xs font-semibold" style={{ color: textColor }}>
          {label}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>
          Clique para ver planos
        </p>
      </button>
    </div>
  )
}

// ─── TrialBanner ─────────────────────────────────────────────
function TrialBanner() {
  const navigate = useNavigate()
  const { isTrial, trialDaysLeft, isActive } = usePlan()

  // só mostra quando trial ativo com ≤ 7 dias OU trial expirado
  if (!isTrial) return null
  if (isActive && trialDaysLeft > 7) return null

  const expired = !isActive
  const bg = expired ? 'var(--color-destructive)' : '#F59E0B'
  const msg = expired
    ? 'Seu período de trial expirou.'
    : `Seu trial expira em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''}.`

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 text-sm font-medium text-white"
      style={{ background: bg }}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {msg} Assine agora para continuar usando o FestaHub.
      </span>
      <button
        onClick={() => navigate('/app/configuracoes')}
        className="shrink-0 rounded-md border border-white/30 px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
      >
        Ver planos
      </button>
    </div>
  )
}

// ─── Sidebar ────────────────────────────────────────────────
interface SidebarProps {
  onClose?: () => void
}

function Sidebar({ onClose }: SidebarProps) {
  const organization = useAuthStore((s) => s.organization)

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'var(--color-sidebar)', color: 'var(--color-sidebar-foreground)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-5"
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        <LogoMark />
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-none text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {organization?.name ?? 'FestaHub'}
          </p>
          <p className="mt-0.5 text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>
            Painel de gestão
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 transition-colors"
            style={{ color: 'var(--color-sidebar-muted)' }}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav label */}
      <p
        className="mt-4 px-4 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-sidebar-muted)' }}
      >
        Menu
      </p>

      {/* Navegação */}
      <nav className="mt-1 flex-1 space-y-0.5 px-2 pb-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              )
            }
            style={({ isActive }) => ({
              backgroundColor: isActive
                ? 'var(--color-sidebar-active)'
                : undefined,
              color: isActive
                ? '#FFFFFF'
                : 'var(--color-sidebar-foreground)',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
                  style={{
                    background: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
                {isActive && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--color-primary)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Plano badge na sidebar */}
      <SidebarPlanBadge />
    </div>
  )
}

// ─── UserMenu ────────────────────────────────────────────────
function UserMenu() {
  const navigate = useNavigate()
  const { profile, organization, clear } = useAuthStore()
  const displayName = profile?.full_name ?? organization?.name ?? 'Minha conta'

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
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 rounded-lg px-2 hover:bg-muted"
        >
          <Avatar name={displayName} />
          <span className="max-w-[140px] truncate text-sm font-medium">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg">
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {organization?.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.full_name}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── AppLayout ───────────────────────────────────────────────
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isActive } = usePlan()

  // Paywall: conta inativa → forçar /app/configuracoes
  useEffect(() => {
    if (!isActive && location.pathname !== '/app/configuracoes') {
      navigate('/app/configuracoes', { replace: true })
    }
  }, [isActive, location.pathname, navigate])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 md:flex md:flex-col">
        <Sidebar />
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex h-14 shrink-0 items-center border-b bg-card px-4 md:px-6"
        >
          <button
            className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile: logo */}
          <div className="flex items-center gap-2 md:hidden">
            <LogoMark size={22} />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              FestaHub
            </span>
          </div>

          <div className="flex-1" />
          <UserMenu />
        </header>

        {/* Banner de trial */}
        <TrialBanner />

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto bg-background p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
