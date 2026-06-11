import { supabase } from '@/lib/supabase'
import type { EventStatus, EventWithDetails } from '@/types/database'
import { createEventTransactions } from '@/services/transactions'

// ── Tipo interno da linha retornada pelo Supabase com joins ──
interface EventRow {
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

const EVENT_SELECT =
  '*, customers(id, name, phone, child_name), packages(id, name, base_price_cents)'

function rowToDetails(row: EventRow): EventWithDetails {
  const { customers, packages, ...event } = row
  return { ...event, customer: customers, package: packages }
}

// ── Payload de criação ───────────────────────────────────────
export interface CreateEventPayload {
  org_id: string
  customer_id: string
  package_id?: string | null
  title?: string | null
  date: string
  start_time?: string | null
  end_time?: string | null
  guests_count?: number | null
  status?: EventStatus
  total_cents: number
  deposit_cents: number
  deposit_paid?: boolean
  notes?: string | null
}

export type UpdateEventPayload = Partial<
  Omit<CreateEventPayload, 'org_id'>
>

// ── Listar festas de um mês ──────────────────────────────────
export async function listByMonth(
  orgId: string,
  year: number,
  month: number, // 1-indexed
): Promise<EventWithDetails[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('org_id', orgId)
    .gte('date', from)
    .lte('date', to)
    .order('date',       { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data as EventRow[]).map(rowToDetails)
}

// ── Criar festa ──────────────────────────────────────────────
export async function createEvent(
  payload: CreateEventPayload,
): Promise<EventWithDetails> {
  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select(EVENT_SELECT)
    .single()

  if (error) throw error
  return rowToDetails(data as EventRow)
}

// ── Atualizar festa ──────────────────────────────────────────
export async function updateEvent(
  id: string,
  payload: UpdateEventPayload,
): Promise<EventWithDetails> {
  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select(EVENT_SELECT)
    .single()

  if (error) throw error
  return rowToDetails(data as EventRow)
}

// ── Remover festa ────────────────────────────────────────────
export async function removeEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

// ── Atualizar apenas o status ────────────────────────────────
export async function updateEventStatus(
  id: string,
  status: EventStatus,
): Promise<EventWithDetails> {
  return updateEvent(id, { status })
}

// ── Confirmar festa + criar transações automáticas ───────────
export async function confirmEventWithTransactions(
  event: EventWithDetails,
): Promise<EventWithDetails> {
  const updated = await updateEvent(event.id, { status: 'confirmada' })

  await createEventTransactions({
    orgId:        event.org_id,
    eventId:      event.id,
    eventDate:    event.date,
    customerName: event.customer.name,
    totalCents:   event.total_cents,
    depositCents: event.deposit_cents,
    depositPaid:  event.deposit_paid,
  })

  return updated
}

// ── Detectar conflito de horário ─────────────────────────────
export async function detectConflicts(opts: {
  orgId: string
  date: string
  startTime: string
  endTime: string
  excludeId?: string
}): Promise<EventWithDetails[]> {
  const { orgId, date, startTime, endTime, excludeId } = opts

  let query = supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('org_id', orgId)
    .eq('date', date)
    .in('status', ['confirmada', 'realizada'])

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) throw error

  return (data as EventRow[])
    .map(rowToDetails)
    .filter((e) => {
      if (!e.start_time || !e.end_time) return false
      // Overlap: NOT (end1 <= start2 OR start1 >= end2)
      return !(endTime <= e.start_time || startTime >= e.end_time)
    })
}
