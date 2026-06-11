import { supabase } from '@/lib/supabase'
import type { Membership, Organization } from '@/types/database'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface CreateOrgPayload {
  name: string
  city: string
  phone: string
}

export interface OrgWithMembership {
  organization: Organization
  membership: Membership
}

/** Cria organização + membership owner via RPC SECURITY DEFINER (bypassa RLS do onboarding). */
export async function createOrgWithOwner(
  _userId: string,
  payload: CreateOrgPayload,
): Promise<OrgWithMembership> {
  const baseSlug = slugify(payload.name)
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const { data: rpcData, error: rpcError } = await supabase.rpc('create_org_with_owner', {
    p_name:  payload.name,
    p_slug:  slug,
    p_city:  payload.city,
    p_phone: payload.phone,
  })

  if (rpcError) throw rpcError

  const { org_id } = rpcData as { org_id: string }

  // Busca os registros criados para retornar tipado
  const result = await getMyOrgAndMembership(_userId)
  if (!result) throw new Error('Organização criada mas não encontrada')

  return result
}

/** Busca organização e membership do usuário autenticado. */
export async function getMyOrgAndMembership(
  userId: string,
): Promise<OrgWithMembership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*, organizations(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { organizations: organization, ...membershipFields } = data as {
    organizations: Organization
  } & Membership

  return { organization, membership: membershipFields }
}
