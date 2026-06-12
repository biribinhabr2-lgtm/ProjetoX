/**
 * /app/escala — Visão do dia: festas + equipe escalada.
 * Regra 2: todos os sub-componentes em nível de módulo.
 */
import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, CalendarDays, Users,
  AlertCircle, CheckCircle2, Circle, Phone, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/authStore'
import { listDayView, listMembers } from '@/services/staff'
import type { DayViewEvent } from '@/services/staff'
import type { StaffMember, EventStaffWithDetails } from '@/types/database'

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

function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null
  return `https://wa.me/55${phone.replace(/\D/g, '')}`
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
  alloc: EventStaffWithDetails
}

function AllocCard({ alloc }: AllocCardProps) {
  const wa = waLink(alloc.staff_member.phone)
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
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-green-600"
          title={`WhatsApp ${alloc.staff_member.name}`}
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

// ── DayEventCard ──────────────────────────────────────────────

interface DayEventCardProps {
  ev: DayViewEvent
}

function DayEventCard({ ev }: DayEventCardProps) {
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
            <AllocCard key={a.id} alloc={a} />
          ))}
        </div>
      )}
    </div>
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
}

function StaffDayCard({ member, myAllocs }: StaffDayCardProps) {
  const wa = waLink(member.phone)

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
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
          >
            <Phone className="mr-1 inline h-3.5 w-3.5" />
            WhatsApp
          </a>
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

  const [date,    setDate]    = useState<Date>(new Date())
  const [events,  setEvents]  = useState<DayViewEvent[]>([])
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)

  const dateStr   = toDateStr(date)
  const dateLabel = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })

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
                    <DayEventCard key={ev.id} ev={ev} />
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
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {sortedMembers.map((m) => (
                      <StaffDayCard
                        key={m.id}
                        member={m}
                        myAllocs={staffAllocMap.get(m.id) ?? []}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  )
}
