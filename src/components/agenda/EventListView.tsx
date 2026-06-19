import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/agenda/EventCard'
import { EmptyState } from '@/components/EmptyState'
import type { EventStatus, EventWithDetails } from '@/types/database'

const ALL_STATUSES: EventStatus[] = ['orcamento', 'confirmada', 'realizada', 'cancelada']

const STATUS_LABELS: Record<EventStatus, string> = {
  orcamento:  'Orçamento',
  confirmada: 'Confirmada',
  realizada:  'Realizada',
  cancelada:  'Cancelada',
}

interface EventListViewProps {
  events: EventWithDetails[]
  onEdit: (event: EventWithDetails) => void
  onConfirm: (event: EventWithDetails) => void
  onMarkDepositPaid: (event: EventWithDetails) => void
  onMarkRealizada: (event: EventWithDetails) => void
  onCancel: (event: EventWithDetails) => void
  onDelete: (event: EventWithDetails) => void
  onNew: () => void
  canManage?: boolean
}

export function EventListView({
  events,
  onEdit,
  onConfirm,
  onMarkDepositPaid,
  onMarkRealizada,
  onCancel,
  onDelete,
  onNew,
  canManage = true,
}: EventListViewProps) {
  const [search,         setSearch]         = useState('')
  const [activeStatuses, setActiveStatuses] = useState<EventStatus[]>([])

  function toggleStatus(s: EventStatus) {
    setActiveStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.title ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      activeStatuses.length === 0 || activeStatuses.includes(e.status)
    return matchSearch && matchStatus
  })

  // Agrupa por data
  const grouped = filtered.reduce<Record<string, EventWithDetails[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  return (
    <div>
      {/* Barra de filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou título…"
            className="h-9 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <Button
              key={s}
              variant={activeStatuses.includes(s) ? 'default' : 'outline'}
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => toggleStatus(s)}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma festa encontrada"
          description={
            search || activeStatuses.length > 0
              ? 'Tente ajustar os filtros de busca'
              : 'Crie sua primeira festa para começar'
          }
          actionLabel={!search && activeStatuses.length === 0 ? 'Nova festa' : undefined}
          onAction={!search && activeStatuses.length === 0 ? onNew : undefined}
        />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3
                className="mb-2 text-sm font-semibold capitalize text-muted-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="space-y-3">
                {grouped[date].map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={onEdit}
                    onConfirm={onConfirm}
                    onMarkDepositPaid={onMarkDepositPaid}
                    onMarkRealizada={onMarkRealizada}
                    onCancel={onCancel}
                    onDelete={onDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
