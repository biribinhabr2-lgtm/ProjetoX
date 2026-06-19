/**
 * Eventos — histórico de festas realizadas e canceladas.
 *
 * Leitura apenas. Lista todos os eventos com status terminal
 * (realizada / cancelada) da organização atual, com busca simples
 * por cliente ou título e ordenação por data (mais recente primeiro).
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
import { listClosed } from '@/services/events'
import { useAuthStore } from '@/stores/authStore'
import type { EventWithDetails } from '@/types/database'

// ── Utilitários ───────────────────────────────────────────────

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const fmtDate = (iso: string) =>
  format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  realizada: { label: 'Realizada', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelada: { label: 'Cancelada', className: 'bg-stone-100 text-stone-600 border-stone-200' },
}

// ── EventRow ──────────────────────────────────────────────────

interface EventRowProps {
  event: EventWithDetails
}

function EventRow({ event }: EventRowProps) {
  const status = STATUS_STYLES[event.status] ?? { label: event.status, className: '' }

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
        <Badge variant="outline" className={status.className}>
          {status.label}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listClosed(orgId, search || undefined)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }, [orgId, search])

  useEffect(() => {
    load()
  }, [load])

  const realizedCount = events.filter((e) => e.status === 'realizada').length
  const canceledCount = events.filter((e) => e.status === 'cancelada').length

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Histórico de Eventos"
        description="Festas realizadas e canceladas da sua organização"
      />

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
          title={search ? 'Nenhum resultado' : 'Nenhum evento fechado ainda'}
          description={
            search
              ? 'Tente outro nome de cliente ou título.'
              : 'Eventos realizados e cancelados aparecerão aqui.'
          }
        />
      ) : (
        <>
          {/* Resumo */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{realizedCount}</strong> realizada{realizedCount !== 1 ? 's' : ''}
            </span>
            <span>·</span>
            <span>
              <strong className="text-foreground">{canceledCount}</strong> cancelada{canceledCount !== 1 ? 's' : ''}
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
