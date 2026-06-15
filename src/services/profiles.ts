import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export async function updateProfile(
  userId: string,
  payload: { full_name?: string | null; avatar_url?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
  if (error) throw error
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}
