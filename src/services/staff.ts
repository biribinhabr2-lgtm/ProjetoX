import { supabase } from '@/lib/supabase'
import type { StaffMember, StaffRole, EventStaff, EventStaffWithDetails, EventStatus } from '@/types/database'

// ─── Tipos de payload ─────────────────────────────────────────

export interface StaffMemberPayload {
  name:              string
  phone?:            string | null
  role?:             StaffRole | null
  hourly_rate_cents?: number | null
  active?:           boolean
  notes?:            string | null
}

export interface AllocatePayload {
  org_id:        string
  event_id:      string
  staff_id:      string
  start_time?:   string | null
  end_time?:     string | null
  role_in_event?: string | null
  confirmed?:    boolean
}

export interface DayViewEvent {
  id:          string
  title:       string | null
  date:        string
  start_time:  string | null
  end_time:    string | null
  status:      EventStatus
  customer_id: string
  allocations: EventStaffWithDetails[]
}

// ─── Funcionários ─────────────────────────────────────────────

export async function listMembers(orgId: string, activeOnly = false): Promise<StaffMember[]> {
  let q = supabase
    .from('staff_members')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (activeOnly) q = q.eq('active', true)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function createMember(orgId: string, payload: StaffMemberPayload): Promise<StaffMember> {
  const { data, error } = await supabase
    .from('staff_members')
    .insert({ ...payload, org_id: orgId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMember(orgId: string, id: string, payload: Partial<StaffMemberPayload>): Promise<StaffMember> {
  const { data, error } = await supabase
    .from('staff_members')
    .update(payload)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleActive(orgId: string, id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('staff_members')
    .update({ active })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) throw error
}

// ─── Alocações ────────────────────────────────────────────────

export async function listAllocationsByEvent(eventId: string): Promise<EventStaffWithDetails[]> {
  const { data, error } = await supabase
    .from('event_staff')
    .select('*, staff_member:staff_members(id,name,phone,role)')
    .eq('event_id', eventId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as EventStaffWithDetails[]
}

export async function allocate(payload: AllocatePayload): Promise<EventStaff> {
  const { data, error } = await supabase
    .from('event_staff')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAllocation(orgId: string, id: string, payload: Partial<AllocatePayload>): Promise<EventStaff> {
  const { data, error } = await supabase
    .from('event_staff')
    .update(payload)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeAllocation(orgId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('event_staff')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) throw error
}

export async function toggleConfirmed(orgId: string, id: string, confirmed: boolean): Promise<void> {
  const { error } = await supabase
    .from('event_staff')
    .update({ confirmed })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) throw error
}

/**
 * Retorna alocações do funcionário em outros eventos na mesma data.
 * Usado para exibir aviso de conflito (não bloqueia a alocação).
 */
export async function checkStaffConflict(
  orgId: string,
  staffId: string,
  date: string,
  excludeEventId: string,
): Promise<EventStaffWithDetails[]> {
  // 1. Buscar IDs de outros eventos na mesma data
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('id')
    .eq('org_id', orgId)
    .eq('date', date)
    .neq('id', excludeEventId)
  if (evErr) throw evErr
  if (!events || events.length === 0) return []

  const ids = events.map((e) => e.id)

  // 2. Verificar se o funcionário está alocado em algum desses eventos
  const { data, error } = await supabase
    .from('event_staff')
    .select('*, staff_member:staff_members(id,name,phone,role)')
    .eq('staff_id', staffId)
    .in('event_id', ids)
  if (error) throw error
  return (data ?? []) as EventStaffWithDetails[]
}

/**
 * Visão do dia para /app/escala: eventos da data com suas alocações.
 */
export async function listDayView(orgId: string, date: string): Promise<DayViewEvent[]> {
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('id,title,date,start_time,end_time,status,customer_id')
    .eq('org_id', orgId)
    .eq('date', date)
    .order('start_time')
  if (evErr) throw evErr
  if (!events || events.length === 0) return []

  const ids = events.map((e) => e.id)

  const { data: allocs, error: alErr } = await supabase
    .from('event_staff')
    .select('*, staff_member:staff_members(id,name,phone,role)')
    .in('event_id', ids)
    .eq('org_id', orgId)
  if (alErr) throw alErr

  const allocsByEvent = new Map<string, EventStaffWithDetails[]>()
  for (const a of (allocs ?? []) as EventStaffWithDetails[]) {
    const arr = allocsByEvent.get(a.event_id) ?? []
    arr.push(a)
    allocsByEvent.set(a.event_id, arr)
  }

  return events.map((ev) => ({
    ...ev,
    allocations: allocsByEvent.get(ev.id) ?? [],
  }))
}
