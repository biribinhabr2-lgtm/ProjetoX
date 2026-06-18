import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Shield, Building2, BarChart3, Bug, Search,
  RefreshCw, Trash2, ChevronDown, CheckCircle, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/PageHeader'

import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'
import { useIsPlatformAdmin } from '@/hooks/useIsPlatformAdmin'

import type { Organization, AuditLog } from '@/types/database'
import type { AdminMetrics } from '@/services/admin'
import {
  listAllOrgs, getEventsCountByOrg, getAdminMetrics,
  getAdminAuditLog, adminSetOrgPlan,
} from '@/services/admin'

// ─── helpers ──────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', essencial: 'Essencial', profissional: 'Profissional', rede: 'Rede',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-stone-100 text-stone-600',
  cancelled: 'bg-red-100 text-red-600',
  pending: 'bg-yellow-100 text-yellow-700',
  trial: 'bg-blue-100 text-blue-700',
}

function planColor(plan: string): string {
  if (plan === 'rede') return 'bg-purple-100 text-purple-700'
  if (plan === 'profissional') return 'bg-blue-100 text-blue-700'
  if (plan === 'essencial') return 'bg-teal-100 text-teal-700'
  return 'bg-stone-100 text-stone-600'
}

function fmt(iso: string): string {
  return format(parseISO(iso), "dd/MM/yy HH:mm", { locale: ptBR })
}

// ─── OrgRow ───────────────────────────────────────────────────

interface OrgRowProps {
  org: Organization
  eventsCount: number
  onChangePlan: (org: Organization) => void
}

function OrgRow({ org, eventsCount, onChangePlan }: OrgRowProps) {
  const daysLeft = org.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <tr className="border-b border-[--color-border] hover:bg-[--color-primary-light]/30 transition-colors">
      <td className="py-2 px-3 font-medium text-sm">{org.name}</td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{org.city ?? '—'}</td>
      <td className="py-2 px-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColor(org.plan)}`}>
          {PLAN_LABELS[org.plan] ?? org.plan}
        </span>
      </td>
      <td className="py-2 px-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[org.subscription_status ?? ''] ?? ''}`}>
          {org.subscription_status ?? '—'}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">
        {daysLeft !== null ? `${daysLeft}d` : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{fmt(org.created_at)}</td>
      <td className="py-2 px-3 text-sm text-center">{eventsCount}</td>
      <td className="py-2 px-3">
        <Button size="sm" variant="outline" onClick={() => onChangePlan(org)}
          className="h-7 text-xs gap-1">
          Alterar <ChevronDown size={12} />
        </Button>
      </td>
    </tr>
  )
}

// ─── ChangePlanDialog ─────────────────────────────────────────

interface ChangePlanDialogProps {
  org: Organization | null
  onClose: () => void
  onSaved: () => void
}

function ChangePlanDialog({ org, onClose, onSaved }: ChangePlanDialogProps) {
  const [plan,     setPlan]     = useState('')
  const [status,   setStatus]   = useState('')
  const [trialEnd, setTrialEnd] = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (org) {
      setPlan(org.plan)
      setStatus(org.subscription_status ?? 'active')
      setTrialEnd(org.trial_ends_at?.slice(0, 10) ?? '')
    }
  }, [org])

  async function handleSave() {
    if (!org) return
    setSaving(true)
    try {
      await adminSetOrgPlan(
        org.id, plan, status,
        trialEnd ? new Date(trialEnd).toISOString() : null,
      )
      toast.success('Plano atualizado')
      onSaved()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!org} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar plano — {org?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Plano</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['trial','essencial','profissional','rede'].map((p) => (
                  <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Status da assinatura</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['active','inactive','pending','cancelled'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Trial ends at (opcional)</label>
            <Input type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab Organizações ─────────────────────────────────────────

function OrgsTab() {
  const [orgs,   setOrgs]   = useState<Organization[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<Organization | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, c] = await Promise.all([listAllOrgs(), getEventsCountByOrg()])
      setOrgs(o)
      setCounts(c)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.city ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar org…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} orgs</span>
      </div>

      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-left">
          <thead className="text-xs text-muted-foreground bg-muted/40">
            <tr>
              {['Nome','Cidade','Plano','Status','Trial','Criada em','Festas',''].map((h) => (
                <th key={h} className="py-2 px-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <OrgRow key={o.id} org={o} eventsCount={counts[o.id] ?? 0} onChangePlan={setTarget} />
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma org encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ChangePlanDialog org={target} onClose={() => setTarget(null)} onSaved={load} />
    </div>
  )
}

// ─── StatBox ──────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold font-display">{value}</p>
    </div>
  )
}

// ─── Tab Métricas ─────────────────────────────────────────────

function MetricsTab() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [log,     setLog]     = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [m, l] = await Promise.all([getAdminMetrics(), getAdminAuditLog(20)])
      setMetrics(m)
      setLog(l)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading || !metrics) {
    return <p className="text-sm text-muted-foreground">Carregando métricas…</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total de orgs"       value={metrics.totalOrgs} />
        <StatBox label="Novas (30 dias)"     value={metrics.newLast30d} />
        <StatBox label="Festas esta semana"  value={metrics.eventsWeek} />
        <StatBox label="Planos ativos"       value={Object.values(metrics.byPlan).reduce((a, b) => a + b, 0)} />
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Por plano</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(metrics.byPlan).map(([p, n]) => (
            <div key={p} className={`px-3 py-1 rounded-full text-sm font-medium ${planColor(p)}`}>
              {PLAN_LABELS[p] ?? p}: {n}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Audit log recente (20 entradas)</h3>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {['Data','Ação','Entidade','Org'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="py-1.5 px-3 text-muted-foreground">{fmt(l.created_at)}</td>
                  <td className="py-1.5 px-3 font-mono">{l.action}</td>
                  <td className="py-1.5 px-3">{l.entity}{l.entity_id ? `:${l.entity_id.slice(0,8)}` : ''}</td>
                  <td className="py-1.5 px-3 text-muted-foreground font-mono">{l.org_id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab Debug ────────────────────────────────────────────────

const PLAN_OPTIONS = ['trial', 'essencial', 'profissional', 'rede']

function DebugTab() {
  const user         = useAuthStore((s) => s.user)
  const organization = useAuthStore((s) => s.organization)
  const simulatedPlan   = useAdminStore((s) => s.simulatedPlan)
  const setSimulatedPlan = useAdminStore((s) => s.setSimulatedPlan)

  const [orgLog, setOrgLog] = useState<AuditLog[]>([])
  const [loadingLog, setLoadingLog] = useState(false)

  async function loadOrgLog() {
    if (!organization) return
    setLoadingLog(true)
    try {
      const l = await getAdminAuditLog(50, organization.id)
      setOrgLog(l)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoadingLog(false)
    }
  }

  function clearCache() {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Session info */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Sessão atual</h3>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs space-y-1 leading-relaxed">
          <p><span className="text-muted-foreground">user.id:       </span>{user?.id ?? '—'}</p>
          <p><span className="text-muted-foreground">user.email:    </span>{user?.email ?? '—'}</p>
          <p><span className="text-muted-foreground">org.id:        </span>{organization?.id ?? '—'}</p>
          <p><span className="text-muted-foreground">org.plan:      </span>{organization?.plan ?? '—'}</p>
          <p><span className="text-muted-foreground">sub.status:    </span>{organization?.subscription_status ?? '—'}</p>
          <p><span className="text-muted-foreground">trial_ends_at: </span>{organization?.trial_ends_at ?? '—'}</p>
          <p><span className="text-muted-foreground">app_version:   </span>{__APP_VERSION__}</p>
          <p><span className="text-muted-foreground">env.MODE:      </span>{import.meta.env.MODE}</p>
          <p><span className="text-muted-foreground">env.DEV:       </span>{String(import.meta.env.DEV)}</p>
        </div>
      </div>

      {/* Simulador de plano */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Simulador de plano</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Override temporário em memória — só visível para você. Recarregar a página reseta.
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setSimulatedPlan(simulatedPlan === p ? null : p)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                simulatedPlan === p
                  ? 'bg-[--color-primary] text-white border-[--color-primary]'
                  : 'border-border hover:bg-muted',
              ].join(' ')}
            >
              {PLAN_LABELS[p]}
              {simulatedPlan === p && <CheckCircle size={12} className="inline ml-1.5" />}
            </button>
          ))}
          {simulatedPlan && (
            <button
              onClick={() => setSimulatedPlan(null)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-destructive text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"
            >
              <XCircle size={13} /> Parar simulação
            </button>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" onClick={clearCache} className="gap-1">
          <Trash2 size={13} /> Limpar cache local e recarregar
        </Button>
        <Button size="sm" variant="outline" onClick={loadOrgLog} disabled={loadingLog} className="gap-1">
          <RefreshCw size={13} className={loadingLog ? 'animate-spin' : ''} />
          Carregar audit log desta org
        </Button>
      </div>

      {/* Audit log da org */}
      {orgLog.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Audit log desta org (50 entradas)</h3>
          <div className="border rounded-lg overflow-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                <tr>
                  {['Data','Ação','Entidade','User'].map((h) => (
                    <th key={h} className="py-2 px-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgLog.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-1.5 px-3 text-muted-foreground">{fmt(l.created_at)}</td>
                    <td className="py-1.5 px-3 font-mono">{l.action}</td>
                    <td className="py-1.5 px-3">{l.entity}{l.entity_id ? `:${l.entity_id.slice(0,8)}` : ''}</td>
                    <td className="py-1.5 px-3 text-muted-foreground font-mono">{l.user_id?.slice(0,8) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin page ───────────────────────────────────────────────

export default function Admin() {
  const isPlatformAdmin = useIsPlatformAdmin()

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Shield size={40} className="opacity-30" />
        <p className="text-sm">Acesso restrito a platform admins.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Painel interno — FestaHub platform admin"
      />

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs"    className="gap-1.5"><Building2 size={14} /> Organizações</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5"><BarChart3 size={14} /> Métricas</TabsTrigger>
          <TabsTrigger value="debug"   className="gap-1.5"><Bug size={14} /> Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs"    className="mt-4"><OrgsTab /></TabsContent>
        <TabsContent value="metrics" className="mt-4"><MetricsTab /></TabsContent>
        <TabsContent value="debug"   className="mt-4"><DebugTab /></TabsContent>
      </Tabs>
    </div>
  )
}
