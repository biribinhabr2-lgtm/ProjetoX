import { supabase } from '@/lib/supabase'

export type InviteRole = 'admin' | 'atendente'

export interface OrgInvite {
  id: string
  org_id: string
  role: InviteRole
  token: string
  expires_at: string
  used_at: string | null
}

/** Cria um convite de 7 dias para a organização. */
export async function createInvite(
  orgId: string,
  role: InviteRole,
  createdBy: string,
): Promise<OrgInvite> {
  const { data, error } = await supabase
    .from('org_invites')
    .insert({ org_id: orgId, role, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return data as OrgInvite
}

/** Aceita um convite via token. Requer usuário autenticado. */
export async function acceptInvite(
  token: string,
): Promise<{ org_id: string; already_member: boolean }> {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) throw error
  return data as { org_id: string; already_member: boolean }
}
