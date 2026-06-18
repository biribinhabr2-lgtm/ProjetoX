// Regra 4: toda query ao Supabase passa por este módulo.
import { supabase } from '@/lib/supabase'
import type { CatalogItem, CatalogUnit } from '@/types/database'

export type { CatalogItem }

export interface CatalogItemPayload {
  name:        string
  description?: string | null
  price_cents: number
  unit:        CatalogUnit
  category?:   string | null
  active?:     boolean
  sort_order?: number
}

export async function listCatalogItems(
  orgId: string,
  activeOnly = false,
): Promise<CatalogItem[]> {
  let q = supabase
    .from('catalog_items')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (activeOnly) q = q.eq('active', true)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as CatalogItem[]
}

export async function createCatalogItem(
  orgId: string,
  payload: CatalogItemPayload,
): Promise<CatalogItem> {
  const { data, error } = await supabase
    .from('catalog_items')
    .insert({ org_id: orgId, ...payload })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as CatalogItem
}

export async function updateCatalogItem(
  orgId: string,
  id: string,
  payload: Partial<CatalogItemPayload>,
): Promise<CatalogItem> {
  const { data, error } = await supabase
    .from('catalog_items')
    .update(payload)
    .eq('id', id)
    .eq('org_id', orgId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as CatalogItem
}

export async function toggleCatalogItemActive(
  orgId: string,
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('catalog_items')
    .update({ active })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)
}

export async function removeCatalogItem(orgId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('catalog_items')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)
}

/** Troca sort_order de dois itens adjacentes (para botões ▲▼). */
export async function swapCatalogOrder(
  orgId: string,
  itemA: { id: string; sort_order: number },
  itemB: { id: string; sort_order: number },
): Promise<void> {
  const [err1, err2] = await Promise.all([
    supabase.from('catalog_items').update({ sort_order: itemB.sort_order }).eq('id', itemA.id).eq('org_id', orgId),
    supabase.from('catalog_items').update({ sort_order: itemA.sort_order }).eq('id', itemB.id).eq('org_id', orgId),
  ]).then(([r1, r2]) => [r1.error, r2.error])

  if (err1) throw new Error(err1.message)
  if (err2) throw new Error(err2.message)
}
