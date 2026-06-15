import { supabase } from '@/lib/supabase'

export type InviteRole = 'admin' | 'atendente'

export async function inviteMember(
  orgId: string,
  email: string,
  role: InviteRole,
): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-member', {
    body: { org_id: orgId, email, role },
  })
  if (error) {
    const msg = (error as { message?: string }).message ?? 'Erro ao enviar convite'
    throw new Error(msg)
  }
}
