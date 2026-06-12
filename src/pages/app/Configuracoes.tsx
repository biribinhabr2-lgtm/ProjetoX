import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Zap,
  Crown,
  Network,
  Loader2,
  Key,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Terminal,
  Shield,
  Clock,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/authStore'
import { updateOrg } from '@/services/orgs'
import { startSubscription, PLANS } from '@/services/billing'
import type { BillingPlan } from '@/services/billing'
import { listApiKeys, createApiKey, revokeApiKey } from '@/services/apiKeys'
import type { ApiKey } from '@/services/apiKeys'
import { usePlan } from '@/hooks/usePlan'
import { trackCliqueAssinar, trackAssinaturaConcluida } from '@/lib/analytics'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

// ─── schema ─────────────────────────────────────────────────────────────────

const orgSchema = z.object({
  name:  z.string().min(2, 'Nome muito curto'),
  city:  z.string().min(2, 'Cidade obrigatória'),
  phone: z.string().min(10, 'Telefone inválido'),
})

type FormData = z.infer<typeof orgSchema>

// ─── OrgForm ────────────────────────────────────────────────────────────────

function OrgForm() {
  const { organization, refreshOrg } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name:  organization?.name  ?? '',
      city:  organization?.city  ?? '',
      phone: organization?.phone ? maskPhone(organization.phone) : '',
    },
  })

  async function onSubmit(data: FormData) {
    if (!organization) return
    setSaving(true)
    try {
      await updateOrg(organization.id, {
        name:  data.name,
        city:  data.city,
        phone: data.phone.replace(/\D/g, ''),
      })
      await refreshOrg()
      toast.success('Dados atualizados com sucesso!')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Nome do buffet</Label>
        <Input id="org-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-city">Cidade</Label>
        <Input id="org-city" {...register('city')} />
        {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-phone">Telefone</Label>
        <Input
          id="org-phone"
          {...register('phone')}
          onChange={(e) => setValue('phone', maskPhone(e.target.value))}
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <Button type="submit" disabled={saving} size="sm">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {saving ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}

// ─── PlanCard ───────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<BillingPlan, React.ElementType> = {
  essencial:    Zap,
  profissional: Crown,
  rede:         Network,
}

interface PlanCardProps {
  info: (typeof PLANS)[number]
  isCurrent: boolean
  isActive: boolean
}

function PlanCard({ info, isCurrent, isActive }: PlanCardProps) {
  const [loading, setLoading] = useState(false)
  const Icon = PLAN_ICONS[info.id]

  async function handleUpgrade() {
    trackCliqueAssinar(info.id)
    setLoading(true)
    try {
      await startSubscription(info.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar assinatura'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex flex-col gap-4 rounded-xl border p-5 transition-shadow"
      style={
        isCurrent && isActive
          ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 1px var(--color-primary)' }
          : undefined
      }
    >
      {isCurrent && isActive && (
        <span
          className="absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Plano atual
        </span>
      )}
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: 'var(--color-primary-light)' }}
        >
          <Icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
        </span>
        <div>
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{info.label}</p>
          <p className="text-sm text-muted-foreground">
            {fmtBRL(info.priceMonthly)}<span className="text-xs">/mês</span>
          </p>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {info.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            {f}
          </li>
        ))}
      </ul>
      {isCurrent && isActive ? (
        <Button variant="outline" size="sm" disabled>Plano ativo</Button>
      ) : (
        <Button
          size="sm"
          disabled={loading}
          onClick={handleUpgrade}
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Aguarde…' : 'Assinar agora'}
        </Button>
      )}
    </div>
  )
}

// ─── BillingSection ─────────────────────────────────────────────────────────

function BillingSection() {
  const organization = useAuthStore((s) => s.organization)
  const { plan, isTrial, trialDaysLeft, isActive } = usePlan()

  const statusLabel = isTrial
    ? `Trial — ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`
    : organization?.subscription_status === 'active'
    ? 'Ativa'
    : 'Inativa'

  const statusColor = isActive ? 'var(--color-success)' : 'var(--color-destructive)'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Badge
          style={{
            background: isActive ? '#F0FDF4' : '#FEF2F2',
            color: statusColor,
            border: `1px solid ${isActive ? '#86EFAC' : '#FCA5A5'}`,
          }}
        >
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
          {statusLabel}
        </Badge>
      </div>

      {!isActive && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {isTrial
            ? 'Seu período de trial expirou. Assine um plano para continuar usando o FestaHub.'
            : 'Sua assinatura está inativa. Escolha um plano abaixo para reativar o acesso.'}
        </div>
      )}

      {isActive && isTrial && trialDaysLeft <= 5 && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }}
        >
          Seu trial expira em {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}. Assine agora para não perder o acesso!
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((info) => (
          <PlanCard key={info.id} info={info} isCurrent={plan === info.id} isActive={isActive} />
        ))}
      </div>
    </div>
  )
}

// ─── NewKeyDialog ────────────────────────────────────────────────────────────

interface NewKeyDialogProps {
  open:     boolean
  onClose:  () => void
  onCreated: (keys: ApiKey[]) => void
}

function NewKeyDialog({ open, onClose, onCreated }: NewKeyDialogProps) {
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [newKey, setNewKey]     = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  function handleClose() {
    setName('')
    setNewKey(null)
    setCopied(false)
    onClose()
  }

  async function handleCreate() {
    if (name.trim().length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres')
      return
    }
    setLoading(true)
    try {
      const result = await createApiKey(name.trim())
      setNewKey(result.key)
      const updated = await listApiKeys()
      onCreated(updated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar chave'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    toast.success('Chave copiada!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            {newKey ? 'Chave gerada — guarde agora!' : 'Gerar nova chave de API'}
          </DialogTitle>
          <DialogDescription>
            {newKey
              ? 'Esta chave não será exibida novamente. Copie e armazene em local seguro.'
              : 'A chave será exibida uma única vez após geração.'}
          </DialogDescription>
        </DialogHeader>

        {!newKey ? (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Nome da chave</Label>
              <Input
                id="key-name"
                placeholder="ex.: Software Desktop v2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div
              className="flex items-center gap-2 rounded-lg border p-3"
              style={{ background: '#F9FAFB' }}
            >
              <code className="flex-1 break-all text-xs">{newKey}</code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Esta chave não será exibida novamente. Se perder, gere uma nova e revogue esta.</span>
            </div>
          </div>
        )}

        <DialogFooter>
          {!newKey ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                disabled={loading || name.trim().length < 2}
                onClick={handleCreate}
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Gerando…' : 'Gerar chave'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── RevokeDialog ────────────────────────────────────────────────────────────

interface RevokeDialogProps {
  apiKey:   ApiKey | null
  onClose:  () => void
  onRevoked: (id: string) => void
}

function RevokeDialog({ apiKey, onClose, onRevoked }: RevokeDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleRevoke() {
    if (!apiKey) return
    setLoading(true)
    try {
      await revokeApiKey(apiKey.id)
      onRevoked(apiKey.id)
      toast.success(`Chave "${apiKey.name}" revogada.`)
      onClose()
    } catch {
      toast.error('Erro ao revogar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!apiKey} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Revogar chave?</DialogTitle>
          <DialogDescription>
            A chave <strong>{apiKey?.name}</strong> deixará de funcionar imediatamente. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleRevoke}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Revogando…' : 'Revogar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ApiKeysSection ──────────────────────────────────────────────────────────

const API_BASE_URL = 'https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1'

function ApiKeysSection() {
  const { can } = usePlan()
  const hasAccess = can('multi_user') // profissional e rede

  const [keys, setKeys]           = useState<ApiKey[]>([])
  const [loading, setLoading]     = useState(false)
  const [showNew, setShowNew]     = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  const loadKeys = useCallback(async () => {
    if (!hasAccess) return
    setLoading(true)
    try {
      setKeys(await listApiKeys())
    } catch {
      toast.error('Erro ao carregar chaves de API')
    } finally {
      setLoading(false)
    }
  }, [hasAccess])

  useEffect(() => { void loadKeys() }, [loadKeys])

  if (!hasAccess) {
    return (
      <div className="space-y-4">
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center"
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'var(--color-primary-light)' }}
          >
            <Shield className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
          </span>
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Recurso exclusivo — Profissional e Rede
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça upgrade para gerar API Keys e integrar sistemas externos.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const activeKeys  = keys.filter((k) => !k.revoked_at)
  const revokedKeys = keys.filter((k) => k.revoked_at)

  return (
    <div className="space-y-6">
      {/* Header e botão */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {activeKeys.length} chave{activeKeys.length !== 1 ? 's' : ''} ativa{activeKeys.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNew(true)}
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Gerar nova chave
        </Button>
      </div>

      {/* Lista de chaves ativas */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nenhuma chave ativa. Clique em "Gerar nova chave" para começar.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {activeKeys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 px-4 py-3">
              <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  fh_live_{k.key_prefix}••••••••
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {k.last_used_at ? fmtDate(k.last_used_at) : 'Nunca usada'}
              </div>
              <Badge
                className="hidden sm:inline-flex shrink-0"
                style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}
              >
                ativa
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={() => setRevokeTarget(k)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Chaves revogadas */}
      {revokedKeys.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {revokedKeys.length} chave{revokedKeys.length !== 1 ? 's' : ''} revogada{revokedKeys.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 divide-y rounded-lg border opacity-60">
            {revokedKeys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-4 py-3">
                <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm line-through text-muted-foreground">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    fh_live_{k.key_prefix}••••••••
                  </p>
                </div>
                <Badge
                  className="hidden sm:inline-flex shrink-0"
                  style={{ background: '#F5F5F4', color: '#78716C', border: '1px solid #D6D3D1' }}
                >
                  revogada
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Documentação embutida */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              Documentação rápida da API
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Base URL: <code className="rounded bg-muted px-1">{API_BASE_URL}</code>
            {' '}— Documentação completa em <code className="rounded bg-muted px-1">docs/API.md</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <ApiDocBlock
            title="Autenticação"
            code={`curl -H "Authorization: Bearer fh_live_<sua_chave>" \\
  ${API_BASE_URL}/events`}
          />
          <ApiDocBlock
            title="Listar festas por período"
            code={`curl -H "Authorization: Bearer fh_live_<chave>" \\
  "${API_BASE_URL}/events?from=2026-06-01&to=2026-06-30"`}
          />
          <ApiDocBlock
            title="Criar festa"
            code={`curl -X POST \\
  -H "Authorization: Bearer fh_live_<chave>" \\
  -H "Content-Type: application/json" \\
  -d '{"customer_id":"<uuid>","date":"2026-07-15","title":"Festa da Maria"}' \\
  ${API_BASE_URL}/events`}
          />
          <ApiDocBlock
            title="Atualizar festa"
            code={`curl -X PATCH \\
  -H "Authorization: Bearer fh_live_<chave>" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"confirmada","total_cents":150000}' \\
  ${API_BASE_URL}/events/<id>`}
          />
          <ApiDocBlock
            title="Buscar clientes"
            code={`curl -H "Authorization: Bearer fh_live_<chave>" \\
  "${API_BASE_URL}/customers?search=Maria&limit=20"`}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewKeyDialog open={showNew} onClose={() => setShowNew(false)} onCreated={setKeys} />
      <RevokeDialog
        apiKey={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onRevoked={(id) => setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k))}
      />
    </div>
  )
}

// ─── ApiDocBlock ─────────────────────────────────────────────────────────────

interface ApiDocBlockProps { title: string; code: string }

function ApiDocBlock({ title, code }: ApiDocBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-1">
      <p className="font-medium text-foreground">{title}</p>
      <div className="relative rounded-md bg-muted">
        <pre className="overflow-x-auto p-3 leading-relaxed">{code}</pre>
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          {copied
            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Configuracoes ───────────────────────────────────────────────────────────

export default function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { plan } = usePlan()

  // Detecta retorno do Mercado Pago após pagamento bem-sucedido
  useEffect(() => {
    if (searchParams.get('sub') === 'ok') {
      trackAssinaturaConcluida(plan !== 'trial' ? plan : undefined)
      toast.success('Assinatura ativada! Bem-vindo ao FestaHub 🎉')
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- executa só no mount

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie os dados, assinatura e integrações da sua organização"
      />

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="plano">Plano e cobrança</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* ── Aba Geral ─────────────────────────────────────────────────── */}
        <TabsContent value="geral">
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
                  Dados do buffet
                </CardTitle>
              </div>
              <CardDescription>Nome, cidade e telefone exibidos no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <OrgForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aba Plano ─────────────────────────────────────────────────── */}
        <TabsContent value="plano">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
                Plano e cobrança
              </CardTitle>
              <CardDescription>Gerencie sua assinatura e escolha o plano ideal</CardDescription>
            </CardHeader>
            <CardContent>
              <BillingSection />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aba API ───────────────────────────────────────────────────── */}
        <TabsContent value="api">
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
                  API Keys
                </CardTitle>
              </div>
              <CardDescription>
                Integre seu software desktop ou outros sistemas via API REST autenticada por chave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeysSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
