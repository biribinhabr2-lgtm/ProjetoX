import type { EventWithDetails } from '@/types/database'
import { cn } from '@/lib/utils'

// Cores por status — variáveis CSS do design system
const statusStyles: Record<string, { bg: string; text: string }> = {
  orcamento:  { bg: '#FFFBEB', text: '#B45309' },
  confirmada: { bg: '#EFF6FF', text: '#1D4ED8' },
  realizada:  { bg: '#F0FDF4', text: '#15803D' },
  cancelada:  { bg: '#F5F5F4', text: '#78716C' },
}

interface EventChipProps {
  event: EventWithDetails
  onClick?: () => void
}

export function EventChip({ event, onClick }: EventChipProps) {
  const style = statusStyles[event.status] ?? statusStyles.orcamento
  const label = event.title ?? event.customer.name

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className={cn(
        'w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight transition-opacity hover:opacity-80',
      )}
      style={{ backgroundColor: style.bg, color: style.text }}
      title={`${label}${event.start_time ? ` — ${event.start_time}` : ''}`}
    >
      {event.start_time ? `${event.start_time.slice(0, 5)} ` : ''}
      {label}
    </button>
  )
}
