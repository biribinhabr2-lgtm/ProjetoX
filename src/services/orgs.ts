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

/** Cria organização + membership owner em transação lógica (2 inserts). */
export async function createOrgWithOwner(
  userId: string,
  payload: CreateOrgPayload,
): Promise<OrgWithMembership> {
  const baseSlug = slugify(payload.name)
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: payload.name,
      slug,
      city: payload.city,
      phone: payload.phone,
    })
    .select()
    .single()

  if (orgError) throw orgError

  const { data: membership, error: memberError } = await supabase
    .from('memberships')
    .insert({ org_id: org.id, user_id: userId, role: 'owner' })
    .select()
    .single()

  if (memberError) throw memberError

  return { organization: org as Organization, membership: membership as Membership }
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
