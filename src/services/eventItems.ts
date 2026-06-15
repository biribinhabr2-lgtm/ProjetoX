import { supabase } from '@/lib/supabase'
import type { EventItem } from '@/types/database'

export interface EventItemPayload {
  catalog_item_id?: string | null
  description:      string
  qty:              number
  unit_price_cents: number
}

export async function listEventItems(eventId: string): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('event_items')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')
  if (error) throw error
  return data ?? []
}

/** Substitui todos os itens do evento (delete + insert). */
export async function syncEventItems(
  orgId:   string,
  eventId: string,
  items:   EventItemPayload[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from('event_items')
    .delete()
    .eq('event_id', eventId)
  if (delErr) throw delErr

  if (items.length === 0) return

  const { error: insErr } = await supabase
    .from('event_items')
    .insert(items.map((i) => ({ ...i, org_id: orgId, event_id: eventId })))
  if (insErr) throw insErr
}
