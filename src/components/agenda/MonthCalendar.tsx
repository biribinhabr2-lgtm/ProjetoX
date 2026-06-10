import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, format, isSameMonth,
  isToday, addMonths, subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventChip } from '@/components/agenda/EventChip'
import { cn } from '@/lib/utils'
import type { EventWithDetails } from '@/types/database'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface MonthCalendarProps {
  currentDate: Date
  events: EventWithDetails[]
  selectedDate: string | null
  onDateChange: (date: Date) => void
  onDayClick: (dateStr: string) => void
  onEventClick: (event: EventWithDetails) => void
}

export function MonthCalendar({
  currentDate,
  events,
  selectedDate,
  onDateChange,
  onDayClick,
  onEventClick,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function eventsForDay(day: Date): EventWithDetails[] {
    const str = format(day, 'yyyy-MM-dd')
    return events.filter((e) => e.date === str)
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card">
      {/* Navegação */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDateChange(subMonths(currentDate, 1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2
          className="text-sm font-semibold capitalize"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDateChange(addMonths(currentDate, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 border-b">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dateStr     = format(day, 'yyyy-MM-dd')
          const isCurrentM  = isSameMonth(day, currentDate)
          const isTodayDay  = isToday(day)
          const isSelected  = selectedDate === dateStr
          const dayEvents   = eventsForDay(day)
          const maxVisible  = 3
          const overflow    = dayEvents.length - maxVisible

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              className={cn(
                'relative min-h-[90px] cursor-pointer border-b border-r p-1.5 transition-colors',
                isCurrentM ? 'bg-card hover:bg-muted/40' : 'bg-muted/20',
                isSelected && 'ring-2 ring-inset ring-primary',
                // Remove right border on last column, bottom on last row
                (idx + 1) % 7 === 0 && 'border-r-0',
                idx >= days.length - 7 && 'border-b-0',
              )}
            >
              {/* Número do dia */}
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    !isCurrentM && 'text-muted-foreground/50',
                    isCurrentM && !isTodayDay && 'text-foreground',
                    isTodayDay && 'bg-primary text-white font-bold',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Chips de eventos */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, maxVisible).map((ev) => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                  />
                ))}
                {overflow > 0 && (
                  <p className="pl-1.5 text-[10px] font-medium text-muted-foreground">
                    +{overflow} mais
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
