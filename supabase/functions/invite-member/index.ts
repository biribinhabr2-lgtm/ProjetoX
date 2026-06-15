/**
 * invite-member — convida um usuário para a organização.
 *
 * Requer JWT válido de owner ou admin da org.
 * Usa supabase.auth.admin.inviteUserByEmail com metadata:
 *   pending_org_id → org que o usuário entrará
 *   pending_role   → papel (atendente | admin)
 * O trigger handle_new_user (migration 0012) cria o membership
 * automaticamente quando o usuário aceitar o convite.
 *
 * Secrets necessários: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                      SUPABASE_ANON_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, corsPreflightResponse, jsonResponse } from '../_shared/cors.ts'

const PLAN_MEMBER_LIMITS: Record<string, number> = {
  trial:        1,
  essencial:    1,
  profissional: 5,
  // rede: unlimited (not in map)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse()
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!

  // ── Autenticar chamador via JWT ──────────────────────────────
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return jsonResponse({ error: 'Unauthorized' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !caller) return jsonResponse({ error: 'Unauthorized' }, 401)

  // ── Validar payload ──────────────────────────────────────────
  let body: { email?: string; role?: string; org_id?: string }
  try { body = await req.json() }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }

  const { email, role, org_id } = body
  if (!email || !org_id) return jsonResponse({ error: 'email e org_id são obrigatórios' }, 400)

  const inviteRole = ['admin', 'atendente'].includes(role ?? '') ? role! : 'atendente'

  // ── Verificar que o chamador é owner/admin da org ────────────
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: callerMembership } = await admin
    .from('memberships')
    .select('role')
    .eq('org_id', org_id)
    .eq('user_id', caller.id)
    .maybeSingle()

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return jsonResponse({ error: 'Sem permissão para convidar membros nesta organização' }, 403)
  }

  // ── Verificar limite de membros do plano ─────────────────────
  const { data: org } = await admin
    .from('organizations')
    .select('plan')
    .eq('id', org_id)
    .maybeSingle()

  const planLimit = PLAN_MEMBER_LIMITS[org?.plan ?? 'essencial']
  if (planLimit !== undefined) {
    const { count } = await admin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)

    if ((count ?? 0) >= planLimit) {
      return jsonResponse({
        error: `Limite de ${planLimit} membro(s) atingido para o plano ${org?.plan}. Faça upgrade para adicionar mais.`,
      }, 400)
    }
  }

  // ── Verificar se já é membro ─────────────────────────────────
  const { data: existingUser } = await admin.auth.admin.listUsers()
  const alreadyUser = existingUser?.users?.find((u) => u.email === email)
  if (alreadyUser) {
    const { data: existingMembership } = await admin
      .from('memberships')
      .select('id')
      .eq('org_id', org_id)
      .eq('user_id', alreadyUser.id)
      .maybeSingle()

    if (existingMembership) {
      return jsonResponse({ error: 'Este usuário já é membro da organização.' }, 400)
    }

    // Usuário já existe no sistema: só cria o membership
    await admin.from('memberships').insert({
      org_id,
      user_id: alreadyUser.id,
      role: inviteRole,
    })
    return jsonResponse({ ok: true, existing_user: true })
  }

  // ── Convidar novo usuário ────────────────────────────────────
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { pending_org_id: org_id, pending_role: inviteRole },
  })

  if (inviteErr) return jsonResponse({ error: inviteErr.message }, 400)

  return jsonResponse({ ok: true })
})
