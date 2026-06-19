/**
 * Eventos — visão geral de TODOS os eventos da organização.
 *
 * Regra 2: componentes auxiliares em nível de módulo.
 * Regra 4: dados via src/services/events.ts.
 */

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { listAll } from '@/services/events'
import { useAuthStore } from '@/stores/authStore'
import type { EventStatus, EventWithDetails } from '@/types/database'

// ── Utilitários ───────────────────────────────────────────────

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const fmtDate = (iso: string) =>
  format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

const STATUS_STYLES: Record<EventStatus, { label: string; className: string }> = {
  orcamento: { label: 'Orçamento', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmada: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  realizada: { label: 'Realizada', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelada: { label: 'Cancelada', className: 'bg-stone-100 text-stone-600 border-stone-200' },
}

const ALL_STATUSES: EventStatus[] = ['orcamento', 'confirmada', 'realizada', 'cancelada']

// ── EventRow ──────────────────────────────────────────────────

interface EventRowProps {
  event: EventWithDetails
}

function EventRow({ event }: EventRowProps) {
  const style = STATUS_STYLES[event.status] ?? { label: event.status, className: '' }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <p className="font-medium text-foreground text-sm">
          {event.title ?? event.customer.child_name ?? '—'}
        </p>
        {event.title && event.customer.child_name && (
          <p className="text-xs text-muted-foreground">{event.customer.child_name}</p>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {event.customer.name}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
        {fmtDate(event.date)}
        {event.start_time && (
          <span className="ml-1 text-xs">
            {event.start_time.slice(0, 5)}
            {event.end_time ? `–${event.end_time.slice(0, 5)}` : ''}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {event.package?.name ?? '—'}
      </td>
      <td className="py-3 px-4 text-sm font-medium text-foreground text-right whitespace-nowrap">
        {fmtBRL(event.total_cents)}
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className={style.className}>
          {style.label}
        </Badge>
      </td>
    </tr>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function Eventos() {
  const orgId = useAuthStore((s) => s.organization?.id)

  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listAll(orgId, {
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }, [orgId, search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Eventos"
        description="Todos os eventos cadastrados na sua organização"
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, criança ou título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-72"
          />
        </div>

        {/* Chips de status */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === ''
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            }`}
          >
            Todos
          </button>
          {ALL_STATUSES.map((s) => {
            const style = STATUS_STYLES[s]
            const active = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? '' : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? style.className
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                {style.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando eventos...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title={search || statusFilter ? 'Nenhum resultado' : 'Nenhum evento cadastrado ainda'}
          description={
            search || statusFilter
              ? 'Tente ajustar os filtros de busca ou status.'
              : 'Crie o primeiro evento na aba Agenda.'
          }
        />
      ) : (
        <>
          {/* Resumo */}
          <div className="flex gap-3 flex-wrap text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{events.length}</strong>{' '}
              evento{events.length !== 1 ? 's' : ''}
              {statusFilter ? ` (${STATUS_STYLES[statusFilter].label.toLowerCase()})` : ' no total'}
            </span>
          </div>

          {/* Tabela */}
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Evento / Criança
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Cliente
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Data
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Pacote
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                      Total
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
