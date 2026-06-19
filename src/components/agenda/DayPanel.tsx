import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/agenda/EventCard'
import { cn } from '@/lib/utils'
import type { EventWithDetails } from '@/types/database'

interface DayPanelProps {
  dateStr: string | null
  events: EventWithDetails[]
  onClose: () => void
  onNewEvent: (dateStr: string) => void
  onEdit: (event: EventWithDetails) => void
  onConfirm: (event: EventWithDetails) => void
  onMarkDepositPaid: (event: EventWithDetails) => void
  onMarkRealizada: (event: EventWithDetails) => void
  onCancel: (event: EventWithDetails) => void
  onDelete: (event: EventWithDetails) => void
  canManage?: boolean
}

export function DayPanel({
  dateStr,
  events,
  onClose,
  onNewEvent,
  onEdit,
  onConfirm,
  onMarkDepositPaid,
  onMarkRealizada,
  onCancel,
  onDelete,
  canManage = true,
}: DayPanelProps) {
  const isOpen = !!dateStr

  const dayEvents = dateStr
    ? events.filter((e) => e.date === dateStr)
    : []

  const formattedDate = dateStr
    ? format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR })
    : ''

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Painel lateral */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l bg-card shadow-xl transition-transform duration-300 ease-out',
          'lg:relative lg:inset-auto lg:z-auto lg:flex lg:shadow-none lg:transition-none',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p
              className="text-sm font-semibold capitalize text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formattedDate || 'Selecione um dia'}
            </p>
            {dayEvents.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {dayEvents.length} festa{dayEvents.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted lg:hidden"
            aria-label="Fechar painel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Botão nova festa */}
        {dateStr && (
          <div className="border-b px-4 py-3">
            <Button
              size="sm"
              className="w-full"
              onClick={() => onNewEvent(dateStr)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova festa neste dia
            </Button>
          </div>
        )}

        {/* Lista de festas do dia */}
        <div className="flex-1 overflow-y-auto p-3">
          {!dateStr ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Clique em um dia no calendário para ver as festas
              </p>
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">Nenhuma festa neste dia</p>
              <p className="mt-1 text-xs text-muted-foreground">Use o botão acima para criar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((event) => (
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
          )}
        </div>
      </div>
    </>
  )
}
