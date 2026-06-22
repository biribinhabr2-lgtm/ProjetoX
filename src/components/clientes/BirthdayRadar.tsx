/**
 * BirthdayRadar — seção "Aniversários do mês" com badge de ferramenta de venda.
 *
 * Mostra clientes com child_birthdate nos próximos 45 dias.
 * Regra 2: sub-componentes (BirthdayCard) definidos em nível de módulo.
 */

import { Cake, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { daysUntilBirthday, ageAtNextBirthday, isBirthdaySoon } from '@/lib/birthday'
import {
  DEFAULT_BIRTHDAY_TEMPLATE,
  renderTemplate,
  buildWhatsAppLink,
} from '@/lib/messageTemplate'
import type { CustomerWithStats } from '@/types/database'

// ── BirthdayCard ─────────────────────────────────────────────
interface BirthdayCardProps {
  customer:         CustomerWithStats
  onOpen:           (customer: CustomerWithStats) => void
  birthdayTemplate: string
}

function BirthdayCard({ customer, onOpen, birthdayTemplate }: BirthdayCardProps) {
  const days = daysUntilBirthday(customer.child_birthdate!)
  const age  = ageAtNextBirthday(customer.child_birthdate!)

  const dayLabel =
    days === 0
      ? 'Hoje! 🎉'
      : days === 1
      ? 'Amanhã'
      : `Em ${days} dias`

  // Formata data de aniversário (só mês e dia, no formato BR)
  const [, mm, dd] = customer.child_birthdate!.split('-')
  const birthdateDisplay = `${dd}/${mm}`

  // Gera link WhatsApp com mensagem renderizada
  const waHref = customer.phone
    ? buildWhatsAppLink(
        customer.phone,
        renderTemplate(birthdayTemplate, {
          crianca:          customer.child_name ?? '',
          responsavel:      customer.name       ?? '',
          data_aniversario: birthdateDisplay,
        }),
      )
    : null

  const urgencyColor =
    days === 0
      ? 'bg-green-50 border-green-200'
      : days <= 7
      ? 'bg-amber-50 border-amber-200'
      : 'bg-blue-50 border-blue-100'

  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-md ${urgencyColor}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(customer)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(customer)}
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
          {customer.child_name?.[0]?.toUpperCase() ?? customer.name[0].toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {customer.child_name ?? customer.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Responsável: {customer.name}
        </p>
        <p className="mt-0.5 text-xs font-medium text-foreground">
          {birthdateDisplay} · Fará <strong>{age} anos</strong>
        </p>
      </div>

      {/* Urgência + ações */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge
          variant="secondary"
          className="text-[10px] font-semibold"
          style={
            days <= 7
              ? { backgroundColor: '#FEF3C7', color: '#92400E' }
              : { backgroundColor: '#DBEAFE', color: '#1E40AF' }
          }
        >
          {dayLabel}
        </Badge>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

// ── BirthdayRadar ─────────────────────────────────────────────
interface BirthdayRadarProps {
  customers:        CustomerWithStats[]
  windowDays?:      number
  onOpenCustomer:   (customer: CustomerWithStats) => void
  birthdayTemplate?: string
}

export function BirthdayRadar({
  customers,
  windowDays = 45,
  onOpenCustomer,
  birthdayTemplate = DEFAULT_BIRTHDAY_TEMPLATE,
}: BirthdayRadarProps) {
  const upcoming = customers
    .filter((c) => c.child_birthdate && isBirthdaySoon(c.child_birthdate, windowDays))
    .sort((a, b) =>
      daysUntilBirthday(a.child_birthdate!) - daysUntilBirthday(b.child_birthdate!),
    )

  if (upcoming.length === 0) return null

  return (
    <div className="mb-6">
      {/* Header da seção */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Cake className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Aniversários próximos
            </p>
            <p className="text-xs text-muted-foreground">
              {upcoming.length} criança{upcoming.length > 1 ? 's' : ''} nos próximos {windowDays} dias
            </p>
          </div>
        </div>
        <Badge
          className="text-xs font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {upcoming.length}
        </Badge>
      </div>

      {/* Grid de cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.slice(0, 6).map((c) => (
          <BirthdayCard key={c.id} customer={c} onOpen={onOpenCustomer} birthdayTemplate={birthdayTemplate} />
        ))}
      </div>

      {upcoming.length > 6 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          + {upcoming.length - 6} outros aniversários
        </p>
      )}
    </div>
  )
}
