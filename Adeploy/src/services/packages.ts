import { supabase } from '@/lib/supabase'
import type { Package } from '@/types/database'

export async function listPackages(orgId: string): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (error) throw error
  return data as Package[]
}
