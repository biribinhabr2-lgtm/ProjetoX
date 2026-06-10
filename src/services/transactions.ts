import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export interface CreateTransactionPayload {
  org_id: string
  event_id?: string | null
  type: 'receita' | 'despesa'
  description: string
  amount_cents: number
  due_date?: string | null
  paid_at?: string | null
  category?: string | null
  payment_method?: string | null
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

/**
 * Cria as transações automáticas ao confirmar uma festa:
 * 1. Sinal (receita paga) — se deposit_cents > 0 e deposit_paid = true
 * 2. Restante (receita a receber) — total - deposit, vence na data da festa
 */
export async function createEventTransactions(opts: {
  orgId: string
  eventId: string
  eventDate: string
  customerName: string
  totalCents: number
  depositCents: number
  depositPaid: boolean
}): Promise<void> {
  const { orgId, eventId, eventDate, customerName, totalCents, depositCents, depositPaid } = opts
  const today = new Date().toISOString().slice(0, 10)

  const inserts: CreateTransactionPayload[] = []

  if (depositCents > 0 && depositPaid) {
    inserts.push({
      org_id: orgId,
      event_id: eventId,
      type: 'receita',
      description: `Sinal — ${customerName}`,
      amount_cents: depositCents,
      due_date: today,
      paid_at: today,
      category: 'sinal',
    })
  }

  const restanteCents = totalCents - depositCents
  if (restanteCents > 0) {
    inserts.push({
      org_id: orgId,
      event_id: eventId,
      type: 'receita',
      description: `Saldo restante — ${customerName}`,
      amount_cents: restanteCents,
      due_date: eventDate,
      paid_at: null,
      category: 'evento',
    })
  }

  if (inserts.length === 0) return

  const { error } = await supabase.from('transactions').insert(inserts)
  if (error) throw error
}
