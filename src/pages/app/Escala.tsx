/**
 * /app/escala — Visão do dia: festas + equipe escalada.
 * Regra 2: todos os sub-componentes em nível de módulo.
 */
import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, CalendarDays, Users,
  AlertCircle, CheckCircle2, Circle, Phone, Loader2, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'
import { listDayView, listMembers } from '@/services/staff'
import type { DayViewEvent } from '@/services/staff'
import type { StaffMember, EventStaffWithDetails } from '@/types/database'
import {
  renderTemplate,
  renderMultiAllocMessage,
  buildWhatsAppLink,
  calcDuracao,
  formatDateBR,
  DEFAULT_TEMPLATE,
} from '@/lib/messageTemplate'

// ── Helpers ───────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function fmtTime(t: string | null | undefined): string {
  return t?.slice(0, 5) ?? ''
}

const STATUS_LABELS: Record<string, string> = {
  orcamento:  'Orçamento',
  confirmada: 'Confirmada',
  realizada:  'Realizada',
  cancelada:  'Cancelada',
}
const STATUS_COLORS: Record<string, string> = {
  orcamento:  'bg-amber-100 text-amber-700',
  confirmada: 'bg-blue-100 text-blue-700',
  realizada:  'bg-green-100 text-green-700',
  cancelada:  'bg-stone-100 text-stone-600',
}

// ── Template helpers ──────────────────────────────────────────

interface TemplateCtx {
  template: string
  orgName:  string
  local:    string
}

interface AllocEvData {
  festa:          string
  data:           string
  horario_inicio: string
  horario_fim:    string
  duracao:        string
  funcao:         string
}

function allocToEvData(alloc: EventStaffWithDetails, ev: DayViewEvent): AllocEvData {
  const start = alloc.start_time ?? ev.start_time ?? null
  const end   = alloc.end_time   ?? ev.end_time   ?? null
  return {
    festa:          ev.title ?? 'Festa',
    data:           ev.date ? formatDateBR(ev.date) : '',
    horario_inicio: fmtTime(start),
    horario_fim:    fmtTime(end),
    duracao:        calcDuracao(start, end),
    funcao:         alloc.role_in_event ?? alloc.staff_member.role ?? '',
  }
}

function buildSingleWaHref(
  ctx:   TemplateCtx,
  alloc: EventStaffWithDetails,
  ev:    DayViewEvent,
): string | null {
  if (!alloc.staff_member.phone) return null
  const evData = allocToEvData(alloc, ev)
  const msg = renderTemplate(ctx.template, {
    nome:           alloc.staff_member.name,
    buffet:         ctx.orgName,
    local:          ctx.local,
    ...evData,
  })
  return buildWhatsAppLink(alloc.staff_member.phone, msg)
}

// ── DateNav ───────────────────────────────────────────────────

interface DateNavProps {
  date: Date
  onChange: (d: Date) => void
}

function DateNav({ date, onChange }: DateNavProps) {
  function shift(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    onChange(d)
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => shift(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <input
        type="date"
        value={toDateStr(date)}
        onChange={(e) => {
          if (e.target.value) onChange(new Date(e.target.value + 'T12:00:00'))
        }}
        className="h-9 rounded-lg border bg-card px-3 text-sm font-medium"
      />
      <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => shift(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => onChange(new Date())}>
        Hoje
      </Button>
    </div>
  )
}

// ── SummaryBar ────────────────────────────────────────────────

interface SummaryBarProps {
  events: DayViewEvent[]
}

function SummaryBar({ events: evs }: SummaryBarProps) {
  const totalPeople = evs.reduce((acc, e) => acc + e.allocations.length, 0)
  const gaps        = evs.filter((e) => e.allocations.length === 0).length
  const unconfirmed = evs.reduce(
    (acc, e) => acc + e.allocations.filter((a) => !a.confirmed).length, 0,
  )

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{evs.length}</span>
        <span className="text-muted-foreground">{evs.length === 1 ? 'festa' : 'festas'}</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{totalPeople}</span>
        <span className="text-muted-foreground">pessoas escaladas</span>
      </div>
      {gaps > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {gaps} {gaps === 1 ? 'festa sem equipe' : 'festas sem equipe'}
        </div>
      )}
      {unconfirmed > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {unconfirmed} não confirmado{unconfirmed !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ── AllocCard ─────────────────────────────────────────────────

interface AllocCardProps {
  alloc:  EventStaffWithDetails
  ev:     DayViewEvent
  ctx:    TemplateCtx
}

function AllocCard({ alloc, ev, ctx }: AllocCardProps) {
  const waHref = buildSingleWaHref(ctx, alloc, ev)

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
      {alloc.confirmed ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-none">{alloc.staff_member.name}</p>
        {(alloc.role_in_event || alloc.start_time) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {alloc.role_in_event}
            {alloc.start_time && alloc.end_time
              ? ` · ${fmtTime(alloc.start_time)}–${fmtTime(alloc.end_time)}`
              : ''}
          </p>
        )}
      </div>
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-green-600"
          title="Enviar escala por WhatsApp"
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span
          title="Cadastre o telefone para enviar pelo WhatsApp"
          className="shrink-0 cursor-not-allowed rounded p-1 text-muted-foreground opacity-30"
        >
          <Phone className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  )
}

// ── DayEventCard ──────────────────────────────────────────────

interface DayEventCardProps {
  ev:  DayViewEvent
  ctx: TemplateCtx
}

function DayEventCard({ ev, ctx }: DayEventCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {ev.title ?? 'Festa'}
          </p>
          {(ev.start_time || ev.end_time) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {fmtTime(ev.start_time)}{ev.end_time ? `–${fmtTime(ev.end_time)}` : ''}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABELS[ev.status] ?? ev.status}
        </span>
      </div>

      {ev.allocations.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          Nenhum funcionário escalado
        </p>
      ) : (
        <div className="space-y-1.5">
          {ev.allocations.map((a) => (
            <AllocCard key={a.id} alloc={a} ev={ev} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── BulkSendEntry & dialog ────────────────────────────────────

interface BulkSendEntry {
  member:  StaffMember
  href:    string
  festas:  string[]
}

interface BulkSendDialogProps {
  open:    boolean
  entries: BulkSendEntry[]
  onClose: () => void
}

function BulkSendDialog({ open, entries, onClose }: BulkSendDialogProps) {
  const [clicked, setClicked] = useState<Set<string>>(new Set())

  function handleClick(id: string) {
    setClicked((prev) => new Set([...prev, id]))
  }

  function handleOpenChange(o: boolean) {
    if (!o) { setClicked(new Set()); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            Enviar escala por WhatsApp
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Clique em cada funcionário para abrir o WhatsApp com a mensagem de escala.
          O WhatsApp não permite envio automático — cada link deve ser clicado individualmente.
        </p>

        <div className="space-y-2">
          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum funcionário com telefone cadastrado.
            </p>
          ) : (
            entries.map((e) => {
              const done = clicked.has(e.member.id)
              return (
                <div
                  key={e.member.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${done ? 'border-green-200 bg-green-50' : 'bg-card'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{e.member.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {e.festas.join(' · ')}
                    </p>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : null}
                  <a
                    href={e.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleClick(e.member.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      done
                        ? 'border bg-white text-green-700 hover:bg-green-50'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={done ? { border: '1px solid #86efac' } : { background: '#25D366' }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {done ? 'Enviado' : 'Abrir'}
                  </a>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── StaffDayCard ──────────────────────────────────────────────

interface StaffAllocEntry {
  alloc: EventStaffWithDetails
  event: DayViewEvent
}

interface StaffDayCardProps {
  member:   StaffMember
  myAllocs: StaffAllocEntry[]
  ctx:      TemplateCtx
}

function StaffDayCard({ member, myAllocs, ctx }: StaffDayCardProps) {
  const waHref = useMemo(() => {
    if (!member.phone || myAllocs.length === 0) return null
    const events = myAllocs.map(({ alloc, event: ev }) => allocToEvData(alloc, ev))
    const msg = renderMultiAllocMessage(
      ctx.template,
      { nome: member.name, buffet: ctx.orgName, local: ctx.local },
      events,
    )
    return buildWhatsAppLink(member.phone, msg)
  }, [member, myAllocs, ctx])

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {member.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-none" style={{ fontFamily: 'var(--font-display)' }}>
            {member.name}
          </p>
          {member.role && (
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">{member.role}</p>
          )}
        </div>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
            title="Enviar escala por WhatsApp"
          >
            <Phone className="mr-1 inline h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : (
          <span
            title={member.phone ? undefined : 'Cadastre o telefone para enviar pelo WhatsApp'}
            className="cursor-not-allowed rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-40"
          >
            <Phone className="mr-1 inline h-3.5 w-3.5" />
            WhatsApp
          </span>
        )}
      </div>

      {myAllocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem festas neste dia.</p>
      ) : (
        <div className="space-y-2">
          {myAllocs.map(({ alloc, event: ev }) => (
            <div
              key={alloc.id}
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              {alloc.confirmed ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-none">{ev.title ?? 'Festa'}</p>
                {(ev.start_time || alloc.start_time) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {alloc.start_time
                      ? `${fmtTime(alloc.start_time)}–${fmtTime(alloc.end_time)}`
                      : `${fmtTime(ev.start_time)}–${fmtTime(ev.end_time)}`}
                    {alloc.role_in_event && ` · ${alloc.role_in_event}`}
                  </p>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[ev.status] ?? ''}`}>
                {STATUS_LABELS[ev.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Escala (page) ─────────────────────────────────────────────

export default function Escala() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id ?? ''

  const [date,      setDate]      = useState<Date>(new Date())
  const [events,    setEvents]    = useState<DayViewEvent[]>([])
  const [members,   setMembers]   = useState<StaffMember[]>([])
  const [loading,   setLoading]   = useState(false)
  const [bulkOpen,  setBulkOpen]  = useState(false)

  const dateStr   = toDateStr(date)
  const dateLabel = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })

  const ctx: TemplateCtx = useMemo(() => ({
    template: organization?.staff_message_template ?? DEFAULT_TEMPLATE,
    orgName:  organization?.name ?? '',
    local:    organization?.address
      || `${organization?.name ?? ''}${organization?.city ? ', ' + organization.city : ''}`,
  }), [organization])

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    Promise.all([
      listDayView(orgId, dateStr),
      listMembers(orgId, true),
    ])
      .then(([evs, mbs]) => { setEvents(evs); setMembers(mbs) })
      .catch(() => toast.error('Erro ao carregar escala'))
      .finally(() => setLoading(false))
  }, [orgId, dateStr])

  // staffId → [{alloc, event}]
  const staffAllocMap = useMemo(() => {
    const map = new Map<string, StaffAllocEntry[]>()
    for (const ev of events) {
      for (const alloc of ev.allocations) {
        const arr = map.get(alloc.staff_id) ?? []
        arr.push({ alloc, event: ev })
        map.set(alloc.staff_id, arr)
      }
    }
    return map
  }, [events])

  // Funcionários com festas no dia aparecem primeiro
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aHas = staffAllocMap.has(a.id) ? 0 : 1
      const bHas = staffAllocMap.has(b.id) ? 0 : 1
      return aHas - bHas || a.name.localeCompare(b.name)
    })
  }, [members, staffAllocMap])

  // Entradas para o dialog de envio em massa
  const bulkEntries = useMemo((): BulkSendEntry[] => {
    return sortedMembers
      .map((m) => {
        const allocs = staffAllocMap.get(m.id) ?? []
        if (!m.phone || allocs.length === 0) return null
        const evData = allocs.map(({ alloc, event: ev }) => allocToEvData(alloc, ev))
        const msg = renderMultiAllocMessage(
          ctx.template,
          { nome: m.name, buffet: ctx.orgName, local: ctx.local },
          evData,
        )
        return {
          member: m,
          href:   buildWhatsAppLink(m.phone, msg),
          festas: allocs.map(({ event: ev }) => ev.title ?? 'Festa'),
        }
      })
      .filter((e): e is BulkSendEntry => e !== null)
  }, [sortedMembers, staffAllocMap, ctx])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escala do dia"
        description={<span className="capitalize">{dateLabel}</span>}
        action={<DateNav date={date} onChange={setDate} />}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <SummaryBar events={events} />

          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma festa neste dia.</p>
            </div>
          ) : (
            <Tabs defaultValue="por-festa">
              <TabsList>
                <TabsTrigger value="por-festa">Por festa</TabsTrigger>
                <TabsTrigger value="por-funcionario">Por funcionário</TabsTrigger>
              </TabsList>

              <TabsContent value="por-festa">
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {events.map((ev) => (
                    <DayEventCard key={ev.id} ev={ev} ctx={ctx} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="por-funcionario">
                {members.length === 0 ? (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Nenhum funcionário cadastrado.{' '}
                    <a href="/app/equipe" className="underline hover:text-foreground">
                      Cadastrar equipe
                    </a>
                  </p>
                ) : (
                  <>
                    {/* Botão de envio em massa */}
                    {bulkEntries.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => setBulkOpen(true)}
                        >
                          <Send className="h-4 w-4" />
                          Enviar escala do dia
                          <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            {bulkEntries.length}
                          </span>
                        </Button>
                      </div>
                    )}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {sortedMembers.map((m) => (
                        <StaffDayCard
                          key={m.id}
                          member={m}
                          myAllocs={staffAllocMap.get(m.id) ?? []}
                          ctx={ctx}
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      <BulkSendDialog
        open={bulkOpen}
        entries={bulkEntries}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  )
}
