import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Building2,
  CheckCircle2,
  Zap,
  Crown,
  Network,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { updateOrg } from '@/services/orgs'
import { startSubscription, PLANS } from '@/services/billing'
import type { BillingPlan } from '@/services/billing'
import { usePlan } from '@/hooks/usePlan'

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

// ─── schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name:  z.string().min(2, 'Nome muito curto'),
  city:  z.string().min(2, 'Cidade obrigatória'),
  phone: z.string().min(10, 'Telefone inválido'),
})

type FormData = z.infer<typeof schema>

// ─── OrgForm ────────────────────────────────────────────────────────────────

function OrgForm() {
  const { organization, refreshOrg } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
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
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {info.label}
          </p>
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
        <Button variant="outline" size="sm" disabled>
          Plano ativo
        </Button>
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
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: statusColor }}
          />
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
          <PlanCard
            key={info.id}
            info={info}
            isCurrent={plan === info.id}
            isActive={isActive}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Configuracoes ───────────────────────────────────────────────────────────

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie os dados e a assinatura da sua organização"
      />

      <Card>
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

      <Card>
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
    </div>
  )
}
