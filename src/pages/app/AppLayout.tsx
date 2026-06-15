import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Calendar,
  Users,
  FileText,
  DollarSign,
  Settings,
  Gift,
  Package,
  Menu,
  X,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Users2,
  ClipboardList,
  Shield,
  Camera,
  HelpCircle,
  Check,
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
import { useAdminStore } from '@/stores/adminStore'
import { signOut } from '@/services/auth'
import { updateProfile } from '@/services/profiles'
import { usePlan } from '@/hooks/usePlan'
import { useIsPlatformAdmin } from '@/hooks/useIsPlatformAdmin'
import { supportWhatsAppLink } from '@/lib/constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const BASE_NAV_ITEMS = [
  { to: '/app/agenda',        label: 'Agenda',        icon: Calendar      },
  { to: '/app/clientes',      label: 'Clientes',      icon: Users         },
  { to: '/app/orcamentos',    label: 'Orçamentos',    icon: FileText      },
  { to: '/app/catalogo',      label: 'Catálogo',      icon: Package       },
  { to: '/app/financeiro',    label: 'Financeiro',    icon: DollarSign    },
  { to: '/app/equipe',        label: 'Equipe',        icon: Users2        },
  { to: '/app/escala',        label: 'Escala',        icon: ClipboardList },
  { to: '/app/indique',       label: 'Indicar',       icon: Gift          },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings      },
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
function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase()
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
    >
      {initial}
    </div>
  )
}

// ─── PhotoDialog ─────────────────────────────────────────────
function PhotoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user } = useAuthStore()
  const [url, setUrl]       = useState(profile?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await updateProfile(user.id, { avatar_url: url.trim() || null })
      // Atualiza store localmente sem re-fetch completo
      useAuthStore.setState((s) => ({
        profile: s.profile ? { ...s.profile, avatar_url: url.trim() || null } : null,
      }))
      toast.success('Foto atualizada!')
      onClose()
    } catch {
      toast.error('Erro ao salvar foto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Foto de perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {url && (
            <div className="flex justify-center">
              <img src={url} alt="preview" className="h-20 w-20 rounded-full object-cover border" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="photo-url">URL da imagem</Label>
            <Input
              id="photo-url"
              placeholder="https://exemplo.com/foto.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Cole o link de uma foto pública. Deixe em branco para remover.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} style={{ background: 'var(--color-primary)', color: '#fff' }}>
            {saving ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />Salvando…</> : <><Check className="mr-1.5 h-4 w-4" />Salvar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  if (!isTrial) return null

  const expired  = !isActive
  const urgent   = isActive && trialDaysLeft <= 5
  const bg       = expired ? 'var(--color-destructive)'
                 : urgent  ? '#DC7500'
                 :           '#F59E0B'
  const msg = expired
    ? 'Seu período de trial expirou. Assine para continuar usando o FestaHub.'
    : `Trial: ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}.${urgent ? ' Assine para não perder acesso!' : ''}`

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 text-sm font-medium text-white"
      style={{ background: bg }}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {msg}
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

// TrialReminderModal removido — o Dialog do Radix capturava foco
// e bloqueava atalhos do browser (F11, DevTools). O TrialBanner
// já exibe o countdown visível no topo da página.

// ─── SimulationBanner ────────────────────────────────────────
function SimulationBanner() {
  const simulatedPlan    = useAdminStore((s) => s.simulatedPlan)
  const setSimulatedPlan = useAdminStore((s) => s.setSimulatedPlan)
  const isPlatformAdmin  = useIsPlatformAdmin()

  if (!isPlatformAdmin || !simulatedPlan) return null

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 text-sm font-medium text-white"
      style={{ background: '#DC2626' }}>
      <span className="flex items-center gap-2">
        <Shield className="h-4 w-4 shrink-0" />
        MODO SIMULAÇÃO — plano {simulatedPlan.toUpperCase()}
      </span>
      <button
        onClick={() => setSimulatedPlan(null)}
        className="shrink-0 rounded-md border border-white/30 px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
      >
        Parar
      </button>
    </div>
  )
}

// ─── Sidebar ────────────────────────────────────────────────
interface SidebarProps {
  onClose?: () => void
}

function Sidebar({ onClose }: SidebarProps) {
  const organization    = useAuthStore((s) => s.organization)
  const isPlatformAdmin = useIsPlatformAdmin()

  const navItems = isPlatformAdmin
    ? [...BASE_NAV_ITEMS, { to: '/app/admin', label: 'Admin', icon: Shield }]
    : BASE_NAV_ITEMS

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
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

      {/* Navegação — overflow-y-auto impede que itens extras empurrem o badge para fora */}
      <nav className="mt-1 flex-1 overflow-y-auto space-y-0.5 px-2 pb-4">
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
  const [photoOpen, setPhotoOpen] = useState(false)

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 rounded-lg px-2 hover:bg-muted"
          >
            <Avatar name={displayName} src={profile?.avatar_url} />
            <span className="max-w-[140px] truncate text-sm font-medium">
              {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Avatar name={displayName} src={profile?.avatar_url} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                {organization?.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.full_name}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer rounded-lg"
            onClick={() => setPhotoOpen(true)}
          >
            <Camera className="mr-2 h-4 w-4" />
            Foto de perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer rounded-lg"
            asChild
          >
            <a href={supportWhatsAppLink('Olá! Preciso de ajuda com o FestaHub.')} target="_blank" rel="noopener noreferrer">
              <HelpCircle className="mr-2 h-4 w-4" />
              Ajuda via WhatsApp
            </a>
          </DropdownMenuItem>
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

      <PhotoDialog open={photoOpen} onClose={() => setPhotoOpen(false)} />
    </>
  )
}

// ─── AppLayout ───────────────────────────────────────────────
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isActive, loading: planLoading } = usePlan()

  // Paywall: conta inativa → forçar /app/configuracoes (só após carregar)
  useEffect(() => {
    if (!planLoading && !isActive && location.pathname !== '/app/configuracoes') {
      navigate('/app/configuracoes', { replace: true })
    }
  }, [planLoading, isActive, location.pathname, navigate])

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
        {/* Banner de simulação (admin) */}
        <SimulationBanner />

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto bg-background p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
