/**
 * transactions.ts — service layer para lançamentos financeiros.
 *
 * Regra 4: todas as queries passam por aqui.
 * Regra 7: dinheiro SEMPRE em centavos (integer). Somas com inteiros, nunca float.
 */

import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionType } from '@/types/database'

// ── Categorias fixas ──────────────────────────────────────────
export const TRANSACTION_CATEGORIES = [
  'festa',
  'sinal',
  'alimentacao',
  'equipe',
  'aluguel',
  'marketing',
  'outros',
] as const

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  festa:       'Festa',
  sinal:       'Sinal',
  alimentacao: 'Alimentação',
  equipe:      'Equipe',
  aluguel:     'Aluguel',
  marketing:   'Marketing',
  outros:      'Outros',
}

// ── Payloads ──────────────────────────────────────────────────
export interface CreateTransactionPayload {
  org_id:          string
  event_id?:       string | null
  type:            TransactionType
  description:     string
  amount_cents:    number           // SEMPRE inteiro, nunca float
  due_date?:       string | null    // 'YYYY-MM-DD'
  paid_at?:        string | null    // 'YYYY-MM-DD'
  category?:       string | null
  payment_method?: string | null
}

export type UpdateTransactionPayload = Partial<Omit<CreateTransactionPayload, 'org_id'>>

// ── Opções de listagem ────────────────────────────────────────
export interface ListByPeriodOptions {
  type?:     TransactionType | ''
  category?: string | ''
  paid?:     'paid' | 'pending' | ''  // '' = todos
}

// ── CRUD principal ────────────────────────────────────────────
export async function listByPeriod(
  orgId: string,
  year:  number,
  month: number,  // 1-indexed
  opts:  ListByPeriodOptions = {},
): Promise<Transaction[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts.type) query = query.eq('type', opts.type)
  if (opts.category) query = query.eq('category', opts.category)
  if (opts.paid === 'paid')    query = query.not('paid_at', 'is', null)
  if (opts.paid === 'pending') query = query.is('paid_at', null)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Transaction[]
}

/**
 * Busca os últimos N meses completos para o gráfico.
 * Retorna por mês: { year, month, receita_cents, despesa_cents }
 * Todas as somas em inteiros via SQL SUM.
 */
export interface MonthSummary {
  year:            number
  month:           number  // 1-indexed
  receita_cents:   number  // sempre inteiro
  despesa_cents:   number  // sempre inteiro
}

export async function listLast6MonthsSummary(orgId: string): Promise<MonthSummary[]> {
  // Constrói range dos últimos 6 meses
  const now = new Date()
  const months: { year: number; month: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const oldest = months[0]
  const from   = `${oldest.year}-${String(oldest.month).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount_cents, due_date')
    .eq('org_id', orgId)
    .gte('due_date', from)

  if (error) throw error

  // Agrupa e soma em centavos (inteiros) — sem float
  const map: Record<string, { receita_cents: number; despesa_cents: number }> = {}
  for (const m of months) {
    map[`${m.year}-${m.month}`] = { receita_cents: 0, despesa_cents: 0 }
  }

  for (const row of (data ?? []) as Transaction[]) {
    if (!row.due_date) continue
    const [y, mo] = row.due_date.split('-').map(Number)
    const key = `${y}-${mo}`
    if (!map[key]) continue
    // Soma com inteiros — regra 7
    if (row.type === 'receita') {
      map[key].receita_cents += row.amount_cents
    } else {
      map[key].despesa_cents += row.amount_cents
    }
  }

  return months.map((m) => ({
    year:  m.year,
    month: m.month,
    ...map[`${m.year}-${m.month}`]!,
  }))
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export async function removeTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

/** Marca lançamento como pago com a data de hoje (ou data informada). */
export async function markPaid(id: string, paidAt?: string): Promise<Transaction> {
  const today = new Date().toISOString().slice(0, 10)
  return updateTransaction(id, { paid_at: paidAt ?? today })
}

// ── Mantém compatibilidade com useEvents (criação automática ao confirmar) ──
export async function createEventTransactions(opts: {
  orgId:        string
  eventId:      string
  eventDate:    string
  customerName: string
  totalCents:   number
  depositCents: number
  depositPaid:  boolean
}): Promise<void> {
  const { orgId, eventId, eventDate, customerName, totalCents, depositCents, depositPaid } = opts
  const today = new Date().toISOString().slice(0, 10)

  const inserts: CreateTransactionPayload[] = []

  if (depositCents > 0 && depositPaid) {
    inserts.push({
      org_id:       orgId,
      event_id:     eventId,
      type:         'receita',
      description:  `Sinal — ${customerName}`,
      amount_cents: depositCents,    // inteiro
      due_date:     today,
      paid_at:      today,
      category:     'sinal',
    })
  }

  // Subtração de inteiros — sem float
  const restanteCents = totalCents - depositCents
  if (restanteCents > 0) {
    inserts.push({
      org_id:       orgId,
      event_id:     eventId,
      type:         'receita',
      description:  `Saldo restante — ${customerName}`,
      amount_cents: restanteCents,   // inteiro
      due_date:     eventDate,
      paid_at:      null,
      category:     'festa',
    })
  }

  if (inserts.length === 0) return

  const { error } = await supabase.from('transactions').insert(inserts)
  if (error) throw error
}
