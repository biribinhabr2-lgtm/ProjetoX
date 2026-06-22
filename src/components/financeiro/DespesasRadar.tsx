/**
 * DespesasRadar — alerta de despesas não pagas com vencimento próximo ou vencidas.
 *
 * Padrão visual idêntico ao BirthdayRadar em src/components/clientes/BirthdayRadar.tsx.
 * Regra 2: sub-componente DespesaCard definido em nível de módulo.
 */

import { useEffect, useState, useCallback } from 'react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listUpcomingExpenses, markPaid } from '@/services/transactions'
import { useAuthStore } from '@/stores/authStore'
import type { Transaction } from '@/types/database'

// ── Formatador BRL (apenas exibição) ─────────────────────────
const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

// ── DespesaCard ───────────────────────────────────────────────
interface DespesaCardProps {
  tx:         Transaction
  todayStr:   string  // 'YYYY-MM-DD' — passado para evitar recalcular por card
  onEdit:     (tx: Transaction) => void
  onMarkPaid: (tx: Transaction) => void
}

function DespesaCard({ tx, todayStr, onEdit, onMarkPaid }: DespesaCardProps) {
  const dueDate = parseISO(tx.due_date!)
  const today   = parseISO(todayStr)
  const diff    = differenceInCalendarDays(dueDate, today)

  const isOverdue = diff < 0
  const isToday   = diff === 0

  const dayLabel = isOverdue
    ? `Vencida há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`
    : isToday
    ? 'Vence hoje!'
    : `Vence em ${diff} dia${diff !== 1 ? 's' : ''}`

  const cardBg = isOverdue
    ? 'bg-red-50 border-red-200'
    : isToday
    ? 'bg-amber-50 border-amber-200'
    : 'bg-yellow-50 border-yellow-100'

  const badgeStyle: React.CSSProperties = isOverdue
    ? { backgroundColor: '#FEE2E2', color: '#991B1B' }
    : isToday
    ? { backgroundColor: '#FEF3C7', color: '#92400E' }
    : { backgroundColor: '#FEF9C3', color: '#713F12' }

  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-md ${cardBg}`}
      role="button"
      tabIndex={0}
      onClick={() => onEdit(tx)}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(tx)}
    >
      {/* Ícone */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        <span className="text-base font-bold text-red-600">↓</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {tx.description ?? '(sem descrição)'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Vencimento: {format(dueDate, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p
          className="mt-0.5 text-sm font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-destructive)' }}
        >
          {fmtBRL(tx.amount_cents)}
        </p>
      </div>

      {/* Urgência + ação */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant="secondary" className="text-[10px] font-semibold" style={badgeStyle}>
          {dayLabel}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-2 text-[11px] font-medium text-green-700 hover:bg-green-100"
          onClick={(e) => { e.stopPropagation(); onMarkPaid(tx) }}
        >
          <CheckCircle2 className="h-3 w-3" />
          Pagar
        </Button>
      </div>
    </div>
  )
}

// ── DespesasRadar ─────────────────────────────────────────────
interface DespesasRadarProps {
  /** Chamar para abrir o formulário de edição da transação */
  onEdit:   (tx: Transaction) => void
  /** Chamado após marcar como pago para recarregar a lista principal */
  onRefresh: () => void
}

export function DespesasRadar({ onEdit, onRefresh }: DespesasRadarProps) {
  const orgId = useAuthStore((s) => s.organization?.id)

  const [items,   setItems]   = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(false)
    try {
      const data = await listUpcomingExpenses(orgId, { windowDays: 7, overdueDaysBack: 90 })
      setItems(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { void load() }, [load])

  async function handleMarkPaid(tx: Transaction) {
    try {
      await markPaid(tx.id)
      toast.success('Despesa marcada como paga!')
      void load()
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao marcar como pago')
    }
  }

  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando despesas a vencer…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Não foi possível carregar as despesas a vencer.
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Nenhuma despesa a vencer nos próximos 7 dias.
      </div>
    )
  }

  const overdueCount  = items.filter((t) => differenceInCalendarDays(parseISO(t.due_date!), parseISO(todayStr)) < 0).length
  const upcomingCount = items.length - overdueCount

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: overdueCount > 0 ? '#FEE2E2' : '#FEF3C7' }}
          >
            <AlertTriangle
              className="h-4 w-4"
              style={{ color: overdueCount > 0 ? '#DC2626' : '#D97706' }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Despesas a vencer
            </p>
            <p className="text-xs text-muted-foreground">
              {overdueCount > 0 && `${overdueCount} vencida${overdueCount > 1 ? 's' : ''}`}
              {overdueCount > 0 && upcomingCount > 0 && ' · '}
              {upcomingCount > 0 && `${upcomingCount} nos próximos 7 dias`}
            </p>
          </div>
        </div>
        <Badge
          className="text-xs font-semibold text-white"
          style={{ backgroundColor: overdueCount > 0 ? 'var(--color-destructive)' : '#D97706' }}
        >
          {items.length}
        </Badge>
      </div>

      {/* Grid de cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map((tx) => (
          <DespesaCard
            key={tx.id}
            tx={tx}
            todayStr={todayStr}
            onEdit={onEdit}
            onMarkPaid={handleMarkPaid}
          />
        ))}
      </div>

      {items.length > 6 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          + {items.length - 6} outras despesas a vencer
        </p>
      )}
    </div>
  )
}
