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

export interface InvitePreview {
  org_id: string
  org_name: string
  role: InviteRole
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

/** Retorna o nome do buffet e o papel do convite sem consumir o token (anon-ok). */
export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token })
  if (error) throw error
  return data as InvitePreview
}

/** Aceita um convite via token. Requer usuário autenticado. */
export async function acceptInvite(
  token: string,
): Promise<{ org_id: string; already_member: boolean }> {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) throw error
  return data as { org_id: string; already_member: boolean }
}

/** Recusa um convite via token. Requer usuário autenticado. */
export async function declineInvite(token: string): Promise<void> {
  const { error } = await supabase.rpc('decline_invite', { p_token: token })
  if (error) throw error
}
