/**
 * customers.ts — service layer para clientes.
 *
 * Regra 4: todas as queries passam por aqui; nunca direto no componente.
 * Regra 7: dinheiro em centavos no banco.
 */

import { supabase } from '@/lib/supabase'
import type { Customer, CustomerWithStats, EventWithDetails } from '@/types/database'
import type { EventStatus } from '@/types/database'

// ── Tipos internos dos joins ─────────────────────────────────
interface EventStatsRow {
  customer_id: string
  total_cents: number
  date: string
  status: EventStatus
}

interface EventDetailRow {
  id: string
  created_at: string
  org_id: string
  customer_id: string
  package_id: string | null
  title: string | null
  date: string
  start_time: string | null
  end_time: string | null
  guests_count: number | null
  status: EventStatus
  total_cents: number
  deposit_cents: number
  deposit_paid: boolean
  notes: string | null
  customers: { id: string; name: string; phone: string | null; child_name: string | null }
  packages: { id: string; name: string; base_price_cents: number } | null
}

// ── Opções de listagem ───────────────────────────────────────
export interface ListCustomersOptions {
  search?: string
  page?: number
  pageSize?: number
  orderBy?: 'name' | 'last_event'
}

export interface ListCustomersResult {
  data: CustomerWithStats[]
  total: number
}

/**
 * Lista clientes com busca, paginação e stats de eventos.
 * Busca e ordenação client-side para suportar sort por "última festa".
 */
export async function listCustomers(
  orgId: string,
  opts: ListCustomersOptions = {},
): Promise<ListCustomersResult> {
  const { search, page = 1, pageSize = 25, orderBy = 'name' } = opts

  // 1. Fetch all matching customers (sem limite — buffets raramente passam de 2k)
  let query = supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (search?.trim()) {
    const term = search.trim()
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const { data: rawCustomers, error } = await query
  if (error) throw error
  const customers = (rawCustomers ?? []) as Customer[]

  // 2. Fetch event stats para os clientes encontrados
  const statsMap: Record<
    string,
    { total_spent_cents: number; events_count: number; last_event_date: string | null }
  > = {}

  if (customers.length > 0) {
    const ids = customers.map((c) => c.id)
    const { data: evRows, error: evErr } = await supabase
      .from('events')
      .select('customer_id, total_cents, date, status')
      .eq('org_id', orgId)
      .in('customer_id', ids)
      .in('status', ['confirmada', 'realizada'])

    if (evErr) throw evErr

    for (const ev of (evRows ?? []) as EventStatsRow[]) {
      if (!statsMap[ev.customer_id]) {
        statsMap[ev.customer_id] = { total_spent_cents: 0, events_count: 0, last_event_date: null }
      }
      statsMap[ev.customer_id].total_spent_cents += ev.total_cents
      statsMap[ev.customer_id].events_count += 1
      const prev = statsMap[ev.customer_id].last_event_date
      if (!prev || ev.date > prev) statsMap[ev.customer_id].last_event_date = ev.date
    }
  }

  // 3. Merge stats
  let merged: CustomerWithStats[] = customers.map((c) => ({
    ...c,
    total_spent_cents: statsMap[c.id]?.total_spent_cents ?? 0,
    events_count:      statsMap[c.id]?.events_count ?? 0,
    last_event_date:   statsMap[c.id]?.last_event_date ?? null,
  }))

  // 4. Sort
  if (orderBy === 'last_event') {
    merged = merged.sort((a, b) => {
      if (!a.last_event_date && !b.last_event_date) return 0
      if (!a.last_event_date) return 1
      if (!b.last_event_date) return -1
      return b.last_event_date.localeCompare(a.last_event_date)
    })
  }

  const total = merged.length

  // 5. Paginate
  const start = (page - 1) * pageSize
  const data  = merged.slice(start, start + pageSize)

  return { data, total }
}

// ── Payload de criação/atualização ───────────────────────────
export interface CreateCustomerPayload {
  org_id: string
  name: string
  phone?: string | null
  email?: string | null
  cpf?: string | null
  notes?: string | null
  child_name?: string | null
  child_birthdate?: string | null
}

export type UpdateCustomerPayload = Partial<Omit<CreateCustomerPayload, 'org_id'>>

// ── CRUD ──────────────────────────────────────────────────────
export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

/** Erro especial lançado quando há festas vinculadas ao cliente */
export class CustomerHasEventsError extends Error {
  // Parâmetro de propriedade não permitido com erasableSyntaxOnly — declarado explicitamente
  readonly eventsCount: number

  constructor(eventsCount: number) {
    super(`Este cliente possui ${eventsCount} festa(s) vinculada(s) e não pode ser removido.`)
    this.name = 'CustomerHasEventsError'
    this.eventsCount = eventsCount
  }
}

/**
 * Remove cliente.
 * Lança `CustomerHasEventsError` se houver festas vinculadas (qualquer status),
 * permitindo que a UI ofereça opção de arquivar/apenas cancelar.
 */
export async function removeCustomer(orgId: string, id: string): Promise<void> {
  // Verificar festas vinculadas
  const { count, error: countErr } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)

  if (countErr) throw countErr

  if ((count ?? 0) > 0) {
    throw new CustomerHasEventsError(count!)
  }

  const { error } = await supabase.from('customers').delete().eq('id', id).eq('org_id', orgId)
  if (error) throw error
}

// ── Histórico de festas do cliente ────────────────────────────
const EVENT_DETAIL_SELECT =
  '*, customers(id, name, phone, child_name), packages(id, name, base_price_cents)'

function rowToEventWithDetails(row: EventDetailRow): EventWithDetails {
  const { customers, packages, ...event } = row
  return { ...event, customer: customers, package: packages }
}

export async function listCustomerEvents(
  customerId: string,
  orgId: string,
): Promise<EventWithDetails[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_DETAIL_SELECT)
    .eq('customer_id', customerId)
    .eq('org_id', orgId)
    .order('date', { ascending: false })

  if (error) throw error
  return (data as EventDetailRow[]).map(rowToEventWithDetails)
}
