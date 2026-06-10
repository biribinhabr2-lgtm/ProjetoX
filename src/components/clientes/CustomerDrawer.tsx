/**
 * CustomerDrawer — painel lateral com detalhes do cliente.
 *
 * Regra 2: sub-componentes (InfoRow, StatItem, EventHistoryItem) em nível de módulo.
 * Regra 4: dados via services (listCustomerEvents chamado aqui via useEffect).
 * Regra 7: dinheiro formatado com Intl.NumberFormat.
 */

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Phone, Mail, FileText, Baby, Calendar,
  MessageCircle, Pencil, Trash2, Loader2, ExternalLink, Cake,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { listCustomerEvents } from '@/services/customers'
import { daysUntilBirthday, ageAtNextBirthday, whatsappLink, isBirthdaySoon } from '@/lib/birthday'
import type { CustomerWithStats, EventWithDetails } from '@/types/database'

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

// ── InfoRow ───────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  )
}

// ── StatItem ──────────────────────────────────────────────────
function StatItem({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p
        className="text-lg font-bold"
        style={{
          fontFamily: 'var(--font-display)',
          color: highlight ? 'var(--color-success)' : undefined,
        }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

// ── EventHistoryItem ──────────────────────────────────────────
function EventHistoryItem({ event }: { event: EventWithDetails }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {event.title ?? `Festa · ${format(parseISO(event.date), 'dd/MM/yyyy')}`}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(parseISO(event.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          {event.package && (
            <span className="text-xs text-muted-foreground">· {event.package.name}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={event.status} />
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-success)', fontFamily: 'var(--font-display)' }}
        >
          {fmtBRL(event.total_cents)}
        </span>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────
interface CustomerDrawerProps {
  customer: CustomerWithStats | null
  orgId: string
  open: boolean
  onClose: () => void
  onEdit: (customer: CustomerWithStats) => void
  onDelete: (customer: CustomerWithStats) => void
}

// ── CustomerDrawer ────────────────────────────────────────────
export function CustomerDrawer({
  customer,
  orgId,
  open,
  onClose,
  onEdit,
  onDelete,
}: CustomerDrawerProps) {
  const [events,  setEvents]  = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(false)

  // Carrega histórico quando o drawer abre
  useEffect(() => {
    if (!open || !customer) { setEvents([]); return }
    setLoading(true)
    listCustomerEvents(customer.id, orgId)
      .then(setEvents)
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar festas')
      })
      .finally(() => setLoading(false))
  }, [open, customer?.id, orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!customer) return null

  const hasBirthdate = !!customer.child_birthdate
  const birthdaySoon = hasBirthdate && isBirthdaySoon(customer.child_birthdate!, 45)
  const daysLeft     = hasBirthdate ? daysUntilBirthday(customer.child_birthdate!) : null
  const nextAge      = hasBirthdate ? ageAtNextBirthday(customer.child_birthdate!) : null

  // Formata a data de aniversário para exibição
  const childBirthdateDisplay = hasBirthdate
    ? format(parseISO(customer.child_birthdate!), "d 'de' MMMM", { locale: ptBR })
    : null

  const avatarLetter = customer.name[0].toUpperCase()

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px]">
        <div className="flex h-full flex-col">
          {/* ── Header ── */}
          <SheetHeader className="relative">
            <div className="flex items-start gap-4 pr-8">
              {/* Avatar */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #c93a21 100%)' }}
              >
                {avatarLetter}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle style={{ fontFamily: 'var(--font-display)' }}>
                    {customer.name}
                  </SheetTitle>
                  {birthdaySoon && (
                    <Badge
                      className="text-[10px] font-semibold text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <Cake className="mr-1 h-3 w-3" />
                      Aniversário em {daysLeft === 0 ? 'hoje!' : `${daysLeft}d`}
                    </Badge>
                  )}
                </div>

                {customer.child_name && (
                  <SheetDescription className="mt-0.5">
                    Criança: {customer.child_name}
                    {nextAge !== null && ` · Fará ${nextAge} anos`}
                    {childBirthdateDisplay && ` em ${childBirthdateDisplay}`}
                  </SheetDescription>
                )}
              </div>
            </div>

            {/* Ações: WhatsApp, editar, excluir */}
            <div className="mt-3 flex flex-wrap gap-2">
              {customer.phone && (
                <a href={whatsappLink(customer.phone)} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(customer)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => onDelete(customer)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </SheetHeader>

          {/* ── Corpo scrollável ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Stats */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatItem label="Festas" value={String(customer.events_count)} />
              <StatItem
                label="Total gasto"
                value={fmtBRL(customer.total_spent_cents)}
                highlight={customer.total_spent_cents > 0}
              />
              <StatItem
                label="Última festa"
                value={
                  customer.last_event_date
                    ? format(parseISO(customer.last_event_date), 'dd/MM/yy')
                    : '—'
                }
              />
            </div>

            {/* Dados de contato */}
            <p
              className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Contato
            </p>
            <div className="divide-y rounded-xl border bg-card">
              {customer.phone ? (
                <div className="px-3">
                  <InfoRow
                    icon={Phone}
                    label="Telefone"
                    value={customer.phone}
                    href={whatsappLink(customer.phone)}
                  />
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">Telefone não informado</div>
              )}
              {customer.email && (
                <div className="px-3">
                  <InfoRow icon={Mail} label="E-mail" value={customer.email} href={`mailto:${customer.email}`} />
                </div>
              )}
              {customer.cpf && (
                <div className="px-3">
                  <InfoRow icon={FileText} label="CPF" value={customer.cpf} />
                </div>
              )}
            </div>

            {/* Criança */}
            {(customer.child_name || customer.child_birthdate) && (
              <>
                <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Criança
                </p>
                <div className="divide-y rounded-xl border bg-card">
                  {customer.child_name && (
                    <div className="px-3">
                      <InfoRow icon={Baby} label="Nome" value={customer.child_name} />
                    </div>
                  )}
                  {hasBirthdate && childBirthdateDisplay && (
                    <div className="px-3">
                      <InfoRow
                        icon={Cake}
                        label="Aniversário"
                        value={`${childBirthdateDisplay} · Fará ${nextAge} anos`}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Observações */}
            {customer.notes && (
              <>
                <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Observações
                </p>
                <p className="rounded-xl border bg-card px-3 py-3 text-sm text-foreground">
                  {customer.notes}
                </p>
              </>
            )}

            {/* Histórico de festas */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Histórico de festas
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-xl border bg-muted/30 py-8 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma festa registrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <EventHistoryItem key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
