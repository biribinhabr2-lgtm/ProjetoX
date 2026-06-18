/**
 * /app/equipe — Cadastro e gestão de funcionários.
 * Regra 2: todos os sub-componentes em nível de módulo.
 */
import { useEffect, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Phone, Loader2, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'
import {
  listMembers, createMember, updateMember, toggleActive,
} from '@/services/staff'
import type { StaffMember, StaffRole } from '@/types/database'
import { supportWhatsAppLink } from '@/lib/constants'

// ── Helpers ───────────────────────────────────────────────────

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'recreador', label: 'Recreador' },
  { value: 'monitor',   label: 'Monitor' },
  { value: 'cozinha',   label: 'Cozinha' },
  { value: 'limpeza',   label: 'Limpeza' },
  { value: 'gerente',   label: 'Gerente' },
  { value: 'outro',     label: 'Outro' },
]

const ROLE_COLORS: Record<string, string> = {
  recreador: 'bg-blue-100 text-blue-700',
  monitor:   'bg-purple-100 text-purple-700',
  cozinha:   'bg-orange-100 text-orange-700',
  limpeza:   'bg-teal-100 text-teal-700',
  gerente:   'bg-red-100 text-red-700',
  outro:     'bg-gray-100 text-gray-700',
}

function fmtPhone(p: string | null): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return p
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return d.replace(/(\d{0,2})/, '($1')
  if (d.length <= 6)  return d.replace(/(\d{2})(\d{0,4})/, '($1) $2')
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

// ── Schema ────────────────────────────────────────────────────

const schema = z.object({
  name:              z.string().min(2, 'Nome muito curto'),
  phone:             z.string().optional(),
  role:              z.enum(['recreador','monitor','cozinha','limpeza','gerente','outro']).nullable().optional(),
  hourly_rate_reais: z.coerce.number().min(0).nullable().optional(),
  active:            z.boolean(),
  notes:             z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── StaffDialog ───────────────────────────────────────────────

interface StaffDialogProps {
  open:    boolean
  orgId:   string
  editing: StaffMember | null
  onClose: () => void
  onSaved: (m: StaffMember, isNew: boolean) => void
}

function StaffDialog({ open, orgId, editing, onClose, onSaved }: StaffDialogProps) {
  const [saving, setSaving] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- z.coerce.number input type é unknown
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData, any>,
    defaultValues: { name: '', phone: '', role: null, hourly_rate_reais: null, active: true, notes: '' },
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        name:              editing.name,
        phone:             editing.phone ?? '',
        role:              editing.role ?? null,
        hourly_rate_reais: editing.hourly_rate_cents != null ? editing.hourly_rate_cents / 100 : null,
        active:            editing.active,
        notes:             editing.notes ?? '',
      })
    } else {
      reset({ name: '', phone: '', role: null, hourly_rate_reais: null, active: true, notes: '' })
    }
  }, [open, editing, reset])

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const payload = {
        name:              data.name.trim(),
        phone:             data.phone?.replace(/\D/g, '') || null,
        role:              data.role ?? null,
        hourly_rate_cents: data.hourly_rate_reais != null
          ? Math.round(data.hourly_rate_reais * 100)
          : null,
        active:            data.active,
        notes:             data.notes?.trim() || null,
      }

      if (editing) {
        const m = await updateMember(orgId, editing.id, payload)
        onSaved(m, false)
        toast.success('Funcionário atualizado!')
      } else {
        const m = await createMember(orgId, payload)
        onSaved(m, true)
        toast.success('Funcionário cadastrado!')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            {editing ? 'Editar funcionário' : 'Novo funcionário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="st-name">Nome *</Label>
            <Input id="st-name" className="h-11" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-role">Função</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem função</SelectItem>
                      {ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-rate">Valor/hora (R$)</Label>
              <Input
                id="st-rate"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                className="h-11"
                {...register('hourly_rate_reais')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="st-phone">Telefone / WhatsApp</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  id="st-phone"
                  type="tel"
                  className="h-11"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                  placeholder="(99) 99999-9999"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="st-notes">Observações</Label>
            <Textarea
              id="st-notes"
              className="min-h-[60px] resize-none"
              placeholder="Habilidades, disponibilidade, observações…"
              {...register('notes')}
            />
          </div>

          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch id="st-active" checked={field.value} onCheckedChange={field.onChange} />
                <Label htmlFor="st-active" className="cursor-pointer">Funcionário ativo</Label>
              </div>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── StaffRow ──────────────────────────────────────────────────

interface StaffRowProps {
  member:         StaffMember
  onEdit:         (m: StaffMember) => void
  onToggleActive: (m: StaffMember) => void
}

function StaffRow({ member, onEdit, onToggleActive }: StaffRowProps) {
  const fmtRate = member.hourly_rate_cents != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
        .format(member.hourly_rate_cents / 100) + '/h'
    : null

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
      {/* Avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        {member.name.trim().charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {member.name}
          </p>
          {member.role && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700'}`}>
              {ROLE_OPTIONS.find((r) => r.value === member.role)?.label ?? member.role}
            </span>
          )}
          {!member.active && (
            <Badge variant="secondary" className="text-xs">Inativo</Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {member.phone && (
            <a
              href={`https://wa.me/55${member.phone.replace(/\D/g,'')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-green-600"
              title="Abrir WhatsApp"
            >
              <Phone className="h-3.5 w-3.5" />
              {fmtPhone(member.phone)}
            </a>
          )}
          {fmtRate && <span>{fmtRate}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={member.active}
          onCheckedChange={() => onToggleActive(member)}
          title={member.active ? 'Desativar' : 'Ativar'}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(member)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Equipe (page) ─────────────────────────────────────────────

export default function Equipe() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id ?? ''

  const [members,    setMembers]    = useState<StaffMember[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing,    setEditing]    = useState<StaffMember | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    listMembers(orgId)
      .then(setMembers)
      .catch(() => toast.error('Erro ao carregar equipe'))
      .finally(() => setLoading(false))
  }, [orgId])

  function handleSaved(m: StaffMember, isNew: boolean) {
    setMembers((prev) =>
      isNew ? [m, ...prev] : prev.map((x) => (x.id === m.id ? m : x)),
    )
  }

  async function handleToggleActive(m: StaffMember) {
    try {
      await toggleActive(orgId, m.id, !m.active)
      setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !m.active } : x)))
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(m: StaffMember) { setEditing(m); setDialogOpen(true) }

  const filtered = members.filter((m) => {
    if (!showInactive && !m.active) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount   = members.filter((m) => m.active).length
  const inactiveCount = members.filter((m) => !m.active).length

  const whatsappLink = supportWhatsAppLink()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Cadastre e gerencie os funcionários do seu buffet."
        action={
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo funcionário
          </Button>
        }
      />

      {/* Resumo */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
          <UserCheck className="h-4 w-4 text-green-600" />
          <span className="font-semibold">{activeCount}</span>
          <span className="text-muted-foreground">ativos</span>
        </div>
        {inactiveCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
            <UserX className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{inactiveCount}</span>
            <span className="text-muted-foreground">inativos</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar funcionário…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 max-w-xs"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            className="scale-90"
          />
          Exibir inativos
        </label>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title="Nenhum funcionário cadastrado"
          description="Cadastre os recreadores, monitores e demais funcionários para escalá-los nas festas."
          actionLabel="Cadastrar funcionário"
          onAction={openNew}
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum funcionário encontrado.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <StaffRow
              key={m.id}
              member={m}
              onEdit={openEdit}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Link suporte */}
      {members.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Dúvidas?{' '}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Fale com o suporte
          </a>
        </p>
      )}

      <StaffDialog
        open={dialogOpen}
        orgId={orgId}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
