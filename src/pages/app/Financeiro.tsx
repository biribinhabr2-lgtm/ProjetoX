/**
 * Financeiro — dashboard + extrato do mês + gráfico 6 meses.
 *
 * Regra 2: sub-componentes (SummaryCard, TransactionRow, DeleteDialog) em nível de módulo.
 * Regra 7: toda aritmética monetária usa inteiros (centavos). Somas com +=, nunca com floats.
 */

import { useCallback, useEffect, useState } from 'react'
import { format, isPast, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, Clock, CheckCircle2, Loader2, Pencil, Trash2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { BarChart6Months } from '@/components/financeiro/BarChart6Months'
import { TransactionForm, type TransactionFormValues } from '@/components/financeiro/TransactionForm'
import {
  listByPeriod, listLast6MonthsSummary,
  createTransaction, updateTransaction, removeTransaction, markPaid,
  TRANSACTION_CATEGORIES, CATEGORY_LABELS,
  type ListByPeriodOptions, type MonthSummary,
} from '@/services/transactions'
import { useAuthStore } from '@/stores/authStore'
import type { Transaction, TransactionType } from '@/types/database'

// ── Formatador BRL (apenas exibição) ─────────────────────────
const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

// ── Nome dos meses ────────────────────────────────────────────
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── SummaryCard ───────────────────────────────────────────────
interface SummaryCardProps {
  label:       string
  cents:       number   // inteiro
  icon:        React.ElementType
  colorClass:  string
  bgClass:     string
  alert?:      boolean  // vencidos ficam vermelhos
}

function SummaryCard({ label, cents, icon: Icon, colorClass, bgClass, alert }: SummaryCardProps) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${alert ? 'border-red-200 bg-red-50' : 'bg-card'}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-xl font-bold ${alert ? 'text-red-600' : colorClass}`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {fmtBRL(cents)}
        </p>
      </div>
    </div>
  )
}

// ── TransactionRow ────────────────────────────────────────────
interface TransactionRowProps {
  tx:         Transaction
  onEdit:     (tx: Transaction) => void
  onDelete:   (tx: Transaction) => void
  onMarkPaid: (tx: Transaction) => void
}

function TransactionRow({ tx, onEdit, onDelete, onMarkPaid }: TransactionRowProps) {
  const isPaid    = !!tx.paid_at
  const isReceita = tx.type === 'receita'

  const overdue = !isPaid && tx.due_date
    ? isPast(parseISO(tx.due_date)) && !isToday(parseISO(tx.due_date))
    : false

  return (
    <tr className="group border-b transition-colors last:border-0 hover:bg-muted/20">
      {/* Tipo + descrição */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: isReceita ? '#16A34A' : '#DC2626' }}
          >
            {isReceita ? '↑' : '↓'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{tx.description}</p>
            <p className="text-xs text-muted-foreground">
              {tx.category ? CATEGORY_LABELS[tx.category as keyof typeof CATEGORY_LABELS] ?? tx.category : '—'}
              {tx.payment_method && ` · ${tx.payment_method}`}
            </p>
          </div>
        </div>
      </td>

      {/* Valor */}
      <td className="hidden px-3 py-3 md:table-cell">
        <span
          className="text-sm font-semibold"
          style={{
            fontFamily: 'var(--font-display)',
            color: isReceita ? 'var(--color-success)' : 'var(--color-destructive)',
          }}
        >
          {isReceita ? '+' : '−'}{fmtBRL(tx.amount_cents)}
        </span>
      </td>

      {/* Vencimento */}
      <td className="hidden px-3 py-3 lg:table-cell">
        <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
          {tx.due_date
            ? format(parseISO(tx.due_date), "d 'de' MMM", { locale: ptBR })
            : '—'}
          {overdue && ' ⚠️'}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        {isPaid ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            {tx.paid_at && format(parseISO(tx.paid_at), 'dd/MM', { locale: ptBR })}
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Clock className="h-3 w-3" />
            {overdue ? 'Vencido' : 'Pendente'}
          </span>
        )}
      </td>

      {/* Ações */}
      <td className="py-3 pr-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!isPaid && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:bg-green-50"
              title="Marcar como pago"
              onClick={() => onMarkPaid(tx)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar"
            onClick={() => onEdit(tx)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            title="Excluir"
            onClick={() => onDelete(tx)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── DeleteDialog ──────────────────────────────────────────────
interface DeleteDialogProps {
  open:      boolean
  tx:        Transaction | null
  deleting:  boolean
  onConfirm: () => void
  onCancel:  () => void
}

function DeleteDialog({ open, tx, deleting, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              Excluir lançamento?
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription>
          O lançamento <strong>{tx?.description}</strong> será removido permanentemente.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Financeiro (página) ───────────────────────────────────────
export default function Financeiro() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id

  // Navegação de mês
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Dados
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chartData,    setChartData]    = useState<MonthSummary[]>([])
  const [loading,      setLoading]      = useState(false)

  // Filtros
  const [filterType,     setFilterType]     = useState<TransactionType | ''>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterPaid,     setFilterPaid]     = useState<ListByPeriodOptions['paid']>('')

  // Diálogos
  const [formOpen,    setFormOpen]    = useState(false)
  const [editingTx,   setEditingTx]   = useState<Transaction | null>(null)
  const [savingForm,  setSavingForm]  = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  // ── Carregar lançamentos do mês ─────────────────────────────
  const loadTransactions = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await listByPeriod(orgId, year, month, {
        type:     filterType,
        category: filterCategory,
        paid:     filterPaid,
      })
      setTransactions(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar lançamentos')
    } finally {
      setLoading(false)
    }
  }, [orgId, year, month, filterType, filterCategory, filterPaid])

  useEffect(() => { void loadTransactions() }, [loadTransactions])

  // ── Gráfico 6 meses (carrega uma vez / quando mês muda) ─────
  useEffect(() => {
    if (!orgId) return
    listLast6MonthsSummary(orgId)
      .then(setChartData)
      .catch(() => { /* não bloqueia a página */ })
  }, [orgId, month])  // recarrega ao navegar para forçar refresh

  // ── Somas do mês — APENAS inteiros, nunca float ─────────────
  // Usamos reduce com inteiros. += sobre number (que é sempre inteiro
  // quando vindo do banco como amount_cents) é seguro.
  const receitasCents  = transactions.reduce((s, t) => t.type === 'receita' ? s + t.amount_cents : s, 0)
  const despesasCents  = transactions.reduce((s, t) => t.type === 'despesa' ? s + t.amount_cents : s, 0)
  const saldoCents     = receitasCents - despesasCents
  const aReceberCents  = transactions.reduce((s, t) =>
    t.type === 'receita' && !t.paid_at ? s + t.amount_cents : s, 0)

  // Lançamentos vencidos (sem paid_at e due_date < hoje)
  const overdueCount = transactions.filter(
    (t) => !t.paid_at && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  ).length

  // ── Navegação de mês ────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  // ── CRUD handlers ───────────────────────────────────────────
  function openCreate() { setEditingTx(null); setFormOpen(true) }
  function openEdit(tx: Transaction) { setEditingTx(tx); setFormOpen(true) }

  async function handleFormSubmit(values: TransactionFormValues) {
    if (!orgId) return
    setSavingForm(true)
    try {
      if (editingTx) {
        await updateTransaction(editingTx.id, values)
        toast.success('Lançamento atualizado!')
      } else {
        await createTransaction({ org_id: orgId, ...values })
        toast.success('Lançamento criado!')
      }
      setFormOpen(false)
      setEditingTx(null)
      void loadTransactions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSavingForm(false)
    }
  }

  async function handleMarkPaid(tx: Transaction) {
    try {
      await markPaid(tx.id)
      toast.success('Marcado como pago!')
      void loadTransactions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeTransaction(deleteTarget.id)
      toast.success('Lançamento removido')
      setDeleteTarget(null)
      void loadTransactions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  if (!orgId) return null

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 pb-4 pt-6 sm:px-6">
        <PageHeader
          title="Financeiro"
          description="Controle completo de receitas, despesas e saldo"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Lançamento
            </Button>
          }
        />
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {/* ── Seletor de mês ── */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            className="min-w-[160px] text-center text-base font-semibold capitalize"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* ── StatCards ── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Receitas"
            cents={receitasCents}
            icon={TrendingUp}
            colorClass="text-green-600"
            bgClass="bg-green-50"
          />
          <SummaryCard
            label="Despesas"
            cents={despesasCents}
            icon={TrendingDown}
            colorClass="text-red-600"
            bgClass="bg-red-50"
          />
          <SummaryCard
            label="Saldo"
            cents={saldoCents}
            icon={Wallet}
            colorClass={saldoCents >= 0 ? 'text-green-600' : 'text-red-600'}
            bgClass={saldoCents >= 0 ? 'bg-green-50' : 'bg-red-50'}
          />
          <SummaryCard
            label={overdueCount > 0 ? `A receber (${overdueCount} vencido${overdueCount > 1 ? 's' : ''})` : 'A receber'}
            cents={aReceberCents}
            icon={Clock}
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
            alert={overdueCount > 0}
          />
        </div>

        {/* ── Gráfico 6 meses ── */}
        {chartData.length > 0 && <BarChart6Months data={chartData} />}

        {/* ── Filtros ── */}
        <div className="flex flex-wrap gap-2">
          {/* Tipo */}
          <Select value={filterType} onValueChange={(v) => setFilterType(v as TransactionType | '')}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>

          {/* Categoria */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {TRANSACTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pago/Pendente */}
          <Select value={filterPaid ?? ''} onValueChange={(v) => setFilterPaid(v as ListByPeriodOptions['paid'])}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear */}
          {(filterType || filterCategory || filterPaid) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => { setFilterType(''); setFilterCategory(''); setFilterPaid('') }}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* ── Tabela de lançamentos ── */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento encontrado"
            description={
              filterType || filterCategory || filterPaid
                ? 'Tente ajustar os filtros'
                : `Nenhum lançamento em ${MONTH_NAMES[month - 1]} de ${year}`
            }
            actionLabel={!filterType && !filterCategory && !filterPaid ? 'Novo lançamento' : undefined}
            onAction={!filterType && !filterCategory && !filterPaid ? openCreate : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Descrição
                  </th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Valor
                  </th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Vencimento
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </tbody>
            </table>

            {/* Rodapé com totais da página */}
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
              <span>{transactions.length} lançamento{transactions.length !== 1 ? 's' : ''}</span>
              <div className="flex gap-4">
                <span className="text-green-700">
                  Receitas: <strong>{fmtBRL(receitasCents)}</strong>
                </span>
                <span className="text-red-700">
                  Despesas: <strong>{fmtBRL(despesasCents)}</strong>
                </span>
                <span className={saldoCents >= 0 ? 'text-green-700' : 'text-red-700'}>
                  Saldo: <strong>{fmtBRL(saldoCents)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de formulário */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditingTx(null) } }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              {editingTx ? 'Editar lançamento' : 'Novo lançamento'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            defaultValues={editingTx ?? undefined}
            saving={savingForm}
            onSubmit={handleFormSubmit}
            onCancel={() => { setFormOpen(false); setEditingTx(null) }}
            submitLabel={editingTx ? 'Salvar alterações' : 'Criar lançamento'}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <DeleteDialog
        open={!!deleteTarget}
        tx={deleteTarget}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
