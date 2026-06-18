/**
 * quotes.ts — service layer para orçamentos.
 *
 * Regra 4: todas as queries passam por aqui.
 * Regra 7: dinheiro em centavos no banco.
 */

import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/services/email'
import type { Quote, QuoteItem, QuoteStatus, QuoteWithCustomer, PublicQuoteResponse } from '@/types/database'

const QUOTE_SELECT =
  '*, customers(id, name, phone, email)'

interface QuoteRow extends Omit<Quote, 'items'> {
  items: QuoteItem[]
  customers: { id: string; name: string; phone: string | null; email: string | null }
}

function rowToQuoteWithCustomer(row: QuoteRow): QuoteWithCustomer {
  const { customers, ...quote } = row
  return { ...quote, customer: customers }
}

// ── Listar orçamentos da org ──────────────────────────────────
export interface ListQuotesOptions {
  search?: string
  status?: QuoteStatus | ''
}

export async function listQuotes(
  orgId: string,
  opts: ListQuotesOptions = {},
): Promise<QuoteWithCustomer[]> {
  let query = supabase
    .from('quotes')
    .select(QUOTE_SELECT)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (opts.status) {
    query = query.eq('status', opts.status)
  }

  const { data, error } = await query
  if (error) throw error

  let results = (data as QuoteRow[]).map(rowToQuoteWithCustomer)

  // Busca client-side por nome do cliente
  if (opts.search?.trim()) {
    const term = opts.search.trim().toLowerCase()
    results = results.filter(
      (q) =>
        q.customer.name.toLowerCase().includes(term) ||
        (q.notes ?? '').toLowerCase().includes(term),
    )
  }

  return results
}

// ── Payload de criação ────────────────────────────────────────
export interface CreateQuotePayload {
  org_id: string
  customer_id: string
  event_id?: string | null
  items: QuoteItem[]
  total_cents: number
  valid_until?: string | null
  notes?: string | null
  status?: QuoteStatus
}

export type UpdateQuotePayload = Partial<Omit<CreateQuotePayload, 'org_id'>>

// ── CRUD ──────────────────────────────────────────────────────
export async function createQuote(payload: CreateQuotePayload): Promise<QuoteWithCustomer> {
  const { data, error } = await supabase
    .from('quotes')
    .insert(payload)
    .select(QUOTE_SELECT)
    .single()

  if (error) throw error
  return rowToQuoteWithCustomer(data as QuoteRow)
}

export async function updateQuote(
  id: string,
  payload: UpdateQuotePayload,
): Promise<QuoteWithCustomer> {
  const { data, error } = await supabase
    .from('quotes')
    .update(payload)
    .eq('id', id)
    .select(QUOTE_SELECT)
    .single()

  if (error) throw error
  return rowToQuoteWithCustomer(data as QuoteRow)
}

export async function removeQuote(orgId: string, id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id).eq('org_id', orgId)
  if (error) throw error
}

// ── Página pública — lê pelo token UUID ──────────────────────
export async function getPublicQuote(token: string): Promise<PublicQuoteResponse> {
  const { data, error } = await supabase.rpc('get_public_quote', { token })
  if (error) throw error
  if (!data) throw new Error('Orçamento não encontrado ou expirado.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC retorna json bruto
  return data as PublicQuoteResponse
}

// ── Atualização pública de status (anon) ─────────────────────
export interface PublicStatusUpdateResult {
  ok: boolean
  error?: string
  status?: string
  quote_id?: string
}

export interface PublicStatusContext {
  orgId: string
  orgName: string
  customerName: string
  total: string
}

export async function updatePublicQuoteStatus(
  token: string,
  status: 'aceito' | 'recusado',
  ctx?: PublicStatusContext,
): Promise<PublicStatusUpdateResult> {
  const { data, error } = await supabase.rpc('update_public_quote_status', {
    p_token:  token,
    p_status: status,
  })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC retorna json bruto
  const result = data as PublicStatusUpdateResult

  // Notifica o dono do buffet quando o cliente aceita — fire-and-forget
  if (status === 'aceito' && result.ok && ctx) {
    void sendEmail({
      template:    'orcamento-aceito',
      quote_token: token,
      data: {
        org_id:        ctx.orgId,
        org_name:      ctx.orgName,
        customer_name: ctx.customerName,
        total:         ctx.total,
      },
    })
  }

  return result
}
