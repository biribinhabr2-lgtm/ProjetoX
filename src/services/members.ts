import { supabase } from '@/lib/supabase'
import type { Membership, Profile } from '@/types/database'

export interface OrgMember {
  membership: Membership
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*, profiles(id, full_name, avatar_url)')
    .eq('org_id', orgId)
    .order('created_at')

  if (error) throw error

  return ((data ?? []) as (Membership & { profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null })[]).map(
    ({ profiles, ...membership }) => ({
      membership,
      profile: profiles ?? { id: membership.user_id, full_name: null, avatar_url: null },
    }),
  )
}
