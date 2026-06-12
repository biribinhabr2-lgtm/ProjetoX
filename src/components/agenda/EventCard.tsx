import { Clock, Users, DollarSign, MoreHorizontal, CheckCircle, XCircle, BadgeCheck, Banknote } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { EventWithDetails } from '@/types/database'

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

interface EventCardProps {
  event: EventWithDetails
  onEdit: (event: EventWithDetails) => void
  onConfirm: (event: EventWithDetails) => void
  onMarkDepositPaid: (event: EventWithDetails) => void
  onMarkRealizada: (event: EventWithDetails) => void
  onCancel: (event: EventWithDetails) => void
  onDelete: (event: EventWithDetails) => void
  className?: string
}

export function EventCard({
  event,
  onEdit,
  onConfirm,
  onMarkDepositPaid,
  onMarkRealizada,
  onCancel,
  onDelete,
  className,
}: EventCardProps) {
  const isConfirmable = event.status === 'orcamento'
  const isDepositable = event.status === 'confirmada' && !event.deposit_paid && event.deposit_cents > 0
  const isRealizavel  = event.status === 'confirmada'
  const isCancelable  = event.status !== 'cancelada' && event.status !== 'realizada'

  return (
    <div
      onClick={() => onEdit(event)}
      className={cn(
        'group relative rounded-xl border bg-card p-4 transition-shadow hover:shadow-md cursor-pointer',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {event.title ?? event.customer.name}
          </p>
          {event.title && (
            <p className="truncate text-xs text-muted-foreground">{event.customer.name}</p>
          )}
        </div>

        {/* stopPropagation: evita que o click no dropdown dispare o onEdit do card */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={event.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => onEdit(event)}>
                Editar festa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isConfirmable && (
                <DropdownMenuItem onClick={() => onConfirm(event)} className="text-blue-600">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar festa
                </DropdownMenuItem>
              )}
              {isDepositable && (
                <DropdownMenuItem onClick={() => onMarkDepositPaid(event)}>
                  <Banknote className="mr-2 h-4 w-4" />
                  Sinal pago
                </DropdownMenuItem>
              )}
              {isRealizavel && (
                <DropdownMenuItem onClick={() => onMarkRealizada(event)} className="text-green-600">
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Marcar realizada
                </DropdownMenuItem>
              )}
              {isCancelable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onCancel(event)} className="text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar festa
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(event)} className="text-destructive">
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {(event.start_time || event.end_time) && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {event.start_time?.slice(0, 5)}
            {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}
          </span>
        )}
        {event.guests_count != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {event.guests_count} convidados
          </span>
        )}
        {event.total_cents > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <DollarSign className="h-3.5 w-3.5" />
            {fmtBRL(event.total_cents)}
          </span>
        )}
      </div>

      {/* Sinal */}
      {event.deposit_cents > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: event.deposit_paid ? 'var(--color-success-bg)' : '#FFFBEB',
              color: event.deposit_paid ? 'var(--color-success)' : '#B45309',
            }}
          >
            Sinal {fmtBRL(event.deposit_cents)} {event.deposit_paid ? '✓ pago' : '· pendente'}
          </span>
        </div>
      )}

      {/* Package */}
      {event.package && (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          📦 {event.package.name}
        </p>
      )}
    </div>
  )
}
