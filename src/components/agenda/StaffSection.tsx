/**
 * StaffSection — seção "Equipe escalada" exibida no EventDialog em modo edição.
 * Regra 2: todos os sub-componentes em nível de módulo.
 */
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Plus, Trash2, CheckCircle2, Circle, AlertTriangle, Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  listAllocationsByEvent,
  listMembers,
  allocate,
  removeAllocation,
  toggleConfirmed,
  checkStaffConflict,
} from '@/services/staff'
import {
  renderTemplate,
  renderMultiAllocMessage,
  buildWhatsAppLink,
  calcDuracao,
  formatDateBR,
  DEFAULT_TEMPLATE,
} from '@/lib/messageTemplate'
import { useAuthStore } from '@/stores/authStore'
import type { StaffMember, EventStaffWithDetails } from '@/types/database'

// ── Labels ────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  recreador: 'Recreador',
  monitor:   'Monitor',
  cozinha:   'Cozinha',
  limpeza:   'Limpeza',
  gerente:   'Gerente',
  outro:     'Outro',
}

// ── Schema alocação ───────────────────────────────────────────
const allocSchema = z.object({
  staff_id:      z.string().min(1, 'Selecione um funcionário'),
  role_in_event: z.string().optional(),
  start_time:    z.string().optional(),
  end_time:      z.string().optional(),
})
type AllocForm = z.infer<typeof allocSchema>

// ── Chip de membro alocado ─────────────────────────────────────
interface AllocChipProps {
  alloc:           EventStaffWithDetails
  waHref:          string | null
  onRemove:        () => void
  onToggleConfirm: () => void
}

function AllocChip({ alloc, waHref, onRemove, onToggleConfirm }: AllocChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <button
        type="button"
        onClick={onToggleConfirm}
        title={alloc.confirmed ? 'Confirmado — clique para desmarcar' : 'Marcar como confirmado'}
        className="shrink-0"
      >
        {alloc.confirmed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-none">{alloc.staff_member.name}</p>
        {(alloc.role_in_event || alloc.staff_member.role) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {alloc.role_in_event || ROLE_LABELS[alloc.staff_member.role ?? ''] || alloc.staff_member.role}
            {alloc.start_time && alloc.end_time && ` · ${alloc.start_time.slice(0,5)}–${alloc.end_time.slice(0,5)}`}
          </p>
        )}
      </div>
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          title="Enviar escala por WhatsApp"
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-green-600"
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span
          title="Cadastre o telefone do funcionário para enviar pelo WhatsApp"
          className="shrink-0 rounded p-1 text-muted-foreground opacity-30 cursor-not-allowed"
        >
          <Phone className="h-3.5 w-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
        title="Remover da escala"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Dialog de alocação ─────────────────────────────────────────
interface AddAllocDialogProps {
  open:         boolean
  orgId:        string
  eventId:      string
  eventDate:    string | null
  allocatedIds: Set<string>
  onClose:      () => void
  onAllocated:  (alloc: EventStaffWithDetails) => void
}

function AddAllocDialog({
  open, orgId, eventId, eventDate, allocatedIds, onClose, onAllocated,
}: AddAllocDialogProps) {
  const [members,   setMembers]   = useState<StaffMember[]>([])
  const [conflicts, setConflicts] = useState<EventStaffWithDetails[]>([])
  const [saving,    setSaving]    = useState(false)

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<AllocForm>({
    resolver: zodResolver(allocSchema),
    defaultValues: { staff_id: '', role_in_event: '', start_time: '', end_time: '' },
  })

  useEffect(() => {
    if (!open) { setConflicts([]); reset(); return }
    listMembers(orgId, true).then(setMembers).catch(() => null)
  }, [open, orgId, reset])

  async function onSubmit(data: AllocForm) {
    setSaving(true)
    setConflicts([])
    try {
      if (eventDate) {
        const found = await checkStaffConflict(orgId, data.staff_id, eventDate, eventId)
        if (found.length > 0) setConflicts(found)
      }

      const result = await allocate({
        org_id:        orgId,
        event_id:      eventId,
        staff_id:      data.staff_id,
        role_in_event: data.role_in_event?.trim() || null,
        start_time:    data.start_time || null,
        end_time:      data.end_time || null,
      })

      const member = members.find((m) => m.id === result.staff_id)!
      onAllocated({
        ...result,
        staff_member: { id: member.id, name: member.name, phone: member.phone, role: member.role },
      })
      toast.success(`${member.name} escalado(a)!`)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao escalar'
      if (msg.includes('unique') || msg.includes('duplicate')) {
        toast.error('Este funcionário já está escalado nesta festa.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const available = members.filter((m) => !allocatedIds.has(m.id))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Escalar funcionário</DialogTitle>
        </DialogHeader>

        {conflicts.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Atenção: este funcionário já está escalado em outra festa neste dia.
              A alocação foi salva mesmo assim.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label>Funcionário *</Label>
            <Controller
              name="staff_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum funcionário disponível.
                      </p>
                    )}
                    {available.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.role && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            · {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staff_id && (
              <p className="text-xs text-destructive">{errors.staff_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="alloc-role">Função na festa (opcional)</Label>
            <Input
              id="alloc-role"
              placeholder="ex: Recreador principal"
              className="h-11"
              {...register('role_in_event')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="alloc-start">Entrada</Label>
              <Input id="alloc-start" type="time" className="h-11" {...register('start_time')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alloc-end">Saída</Label>
              <Input id="alloc-end" type="time" className="h-11" {...register('end_time')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || available.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Escalar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── helpers de template ───────────────────────────────────────

function buildAllocWaHref(
  alloc:          EventStaffWithDetails,
  template:       string,
  orgName:        string,
  local:          string,
  eventDate:      string | null,
  eventTitle:     string | null | undefined,
  eventStartTime: string | null | undefined,
  eventEndTime:   string | null | undefined,
): string | null {
  if (!alloc.staff_member.phone) return null
  const start = alloc.start_time ?? eventStartTime ?? null
  const end   = alloc.end_time   ?? eventEndTime   ?? null
  const data: Record<string, string> = {
    nome:           alloc.staff_member.name,
    buffet:         orgName,
    local,
    festa:          eventTitle ?? 'Festa',
    data:           eventDate ? formatDateBR(eventDate) : '',
    horario_inicio: start?.slice(0, 5) ?? '',
    horario_fim:    end?.slice(0, 5)   ?? '',
    duracao:        calcDuracao(start, end),
    funcao:         alloc.role_in_event ?? alloc.staff_member.role ?? '',
    observacoes:    '',
  }
  const message = renderMultiAllocMessage(template, { nome: data.nome, buffet: data.buffet, local }, [
    {
      festa:          data.festa,
      data:           data.data,
      horario_inicio: data.horario_inicio,
      horario_fim:    data.horario_fim,
      duracao:        data.duracao,
      funcao:         data.funcao,
    },
  ])
  // renderMultiAllocMessage com 1 evento chama renderTemplate internamente
  const singleMsg = renderTemplate(template, data)
  return buildWhatsAppLink(alloc.staff_member.phone, singleMsg)
}

// ── StaffSection ───────────────────────────────────────────────
export interface StaffSectionProps {
  orgId:          string
  eventId:        string
  eventDate:      string | null
  eventTitle?:    string | null
  eventStartTime?: string | null
  eventEndTime?:   string | null
}

export function StaffSection({
  orgId,
  eventId,
  eventDate,
  eventTitle,
  eventStartTime,
  eventEndTime,
}: StaffSectionProps) {
  const organization  = useAuthStore((s) => s.organization)
  const [allocations, setAllocations] = useState<EventStaffWithDetails[]>([])
  const [addOpen,     setAddOpen]     = useState(false)
  const [loading,     setLoading]     = useState(true)

  const template = organization?.staff_message_template ?? DEFAULT_TEMPLATE
  const orgName  = organization?.name ?? ''
  const local    = organization?.address
    || `${orgName}${organization?.city ? ', ' + organization.city : ''}`

  useEffect(() => {
    setLoading(true)
    listAllocationsByEvent(eventId)
      .then(setAllocations)
      .catch(() => toast.error('Erro ao carregar equipe'))
      .finally(() => setLoading(false))
  }, [eventId])

  function handleAllocated(alloc: EventStaffWithDetails) {
    setAllocations((prev) => [...prev, alloc])
  }

  async function handleRemove(allocId: string) {
    try {
      await removeAllocation(allocId)
      setAllocations((prev) => prev.filter((a) => a.id !== allocId))
    } catch {
      toast.error('Erro ao remover')
    }
  }

  async function handleToggleConfirm(alloc: EventStaffWithDetails) {
    try {
      await toggleConfirmed(alloc.id, !alloc.confirmed)
      setAllocations((prev) =>
        prev.map((a) => (a.id === alloc.id ? { ...a, confirmed: !alloc.confirmed } : a)),
      )
    } catch {
      toast.error('Erro ao atualizar confirmação')
    }
  }

  const allocatedIds = new Set(allocations.map((a) => a.staff_id))

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Equipe escalada
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Escalar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : allocations.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          Nenhum funcionário escalado ainda.
        </div>
      ) : (
        <div className="space-y-1.5">
          {allocations.map((a) => {
            const waHref = buildAllocWaHref(
              a, template, orgName, local,
              eventDate, eventTitle, eventStartTime, eventEndTime,
            )
            return (
              <AllocChip
                key={a.id}
                alloc={a}
                waHref={waHref}
                onRemove={() => handleRemove(a.id)}
                onToggleConfirm={() => handleToggleConfirm(a)}
              />
            )
          })}
        </div>
      )}

      <AddAllocDialog
        open={addOpen}
        orgId={orgId}
        eventId={eventId}
        eventDate={eventDate}
        allocatedIds={allocatedIds}
        onClose={() => setAddOpen(false)}
        onAllocated={handleAllocated}
      />
    </div>
  )
}
