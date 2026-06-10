/**
 * create-subscription — cria assinatura Mercado Pago (preapproval) para a org do usuário.
 *
 * Fluxo:
 *  1. Valida JWT do usuário via Supabase Auth (getUser).
 *  2. Verifica que o usuário é owner da organização via memberships.
 *  3. Cria o preapproval na API do MP com os dados do plano escolhido.
 *  4. Persiste subscription_id + plan na tabela organizations.
 *  5. Retorna { init_point } para o frontend redirecionar o usuário.
 *
 * Segredos (NUNCA no código):
 *   MP_ACCESS_TOKEN          — token privado do MP (Suas integrações → Credenciais)
 *   SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente pelo Supabase runtime
 *   SUPABASE_URL              — injetado automaticamente pelo Supabase runtime
 *   APP_URL                   — ex: https://festahub.vercel.app
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders, corsPreflightResponse, jsonResponse,
} from '../_shared/cors.ts'
import {
  mpFetch,
  type MpPreapproval,
  type MpPreapprovalCreateBody,
} from '../_shared/mp-api.ts'

// ── Preços dos planos em BRL decimal (MP exige decimal, NÃO centavos) ─────
const PLAN_PRICES: Record<string, number> = {
  essencial:    97.00,
  profissional: 197.00,
  rede:         397.00,
}

const PLAN_LABELS: Record<string, string> = {
  essencial:    'Essencial',
  profissional: 'Profissional',
  rede:         'Rede',
}

// ── Tipo do body esperado ─────────────────────────────────────────────────
interface RequestBody {
  plan: string
}

// ── Row de membership retornado pelo Supabase ─────────────────────────────
interface MembershipRow {
  org_id: string
  role:   string
}

// ── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsPreflightResponse()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // ── 1. Ler e validar env vars ───────────────────────────────────────
    const mpAccessToken  = Deno.env.get('MP_ACCESS_TOKEN')
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const appUrl         = Deno.env.get('APP_URL')

    if (!mpAccessToken || !supabaseUrl || !serviceRoleKey || !appUrl) {
      console.error('create-subscription: missing env vars')
      return jsonResponse({ error: 'Configuração interna incompleta' }, 500)
    }

    // ── 2. Extrair e verificar JWT ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Token de autorização ausente' }, 401)
    }
    const jwt = authHeader.slice(7)

    const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !user) {
      console.warn('create-subscription: invalid JWT:', userError?.message)
      return jsonResponse({ error: 'Token inválido ou expirado' }, 401)
    }

    // ── 3. Parse e validar body ─────────────────────────────────────────
    let body: RequestBody
    try {
      body = await req.json() as RequestBody
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }

    const { plan } = body
    if (typeof plan !== 'string' || !PLAN_PRICES[plan]) {
      return jsonResponse(
        { error: 'Plano inválido. Valores aceitos: essencial, profissional, rede' },
        400,
      )
    }

    // ── 4. Verificar que o usuário é owner da organização ───────────────
    const { data: membershipData, error: membershipError } = await admin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (membershipError) {
      console.error('create-subscription: membership query error:', membershipError)
      return jsonResponse({ error: 'Erro ao verificar permissão' }, 500)
    }

    const membership = membershipData as MembershipRow | null
    if (!membership) {
      return jsonResponse({ error: 'Usuário não é owner de nenhuma organização' }, 403)
    }
    const orgId: string = membership.org_id

    // ── 5. Criar preapproval no Mercado Pago ────────────────────────────
    const mpBody: MpPreapprovalCreateBody = {
      reason:             `FestaHub – ${PLAN_LABELS[plan]}`,
      back_url:           `${appUrl}/app/configuracoes?sub=ok`,
      external_reference: orgId,
      // E-mail do usuário logado — obrigatório pela API do MP
      payer_email:        user.email ?? '',
      auto_recurring: {
        frequency:          1,
        frequency_type:     'months',
        // Preço em decimal BRL — interface com API externa, não com nosso banco
        transaction_amount: PLAN_PRICES[plan],
        currency_id:        'BRL',
      },
    }

    const mpResult = await mpFetch<MpPreapproval>(
      '/preapproval',
      { method: 'POST', body: JSON.stringify(mpBody) },
      mpAccessToken,
    )

    if (!mpResult.ok) {
      console.error('create-subscription: MP API error:', mpResult.status, mpResult.message)
      return jsonResponse(
        { error: `Erro ao criar assinatura no Mercado Pago: ${mpResult.message}` },
        502,
      )
    }

    const preapproval = mpResult.data

    // ── 6. Persistir subscription_id e plano na organização ────────────
    //    Status inicia como 'pending' — o webhook irá atualizar para 'active'
    //    após o usuário concluir o pagamento no checkout do MP.
    const { error: updateError } = await admin
      .from('organizations')
      .update({
        subscription_id:     preapproval.id,
        subscription_status: 'pending',
        plan,
      })
      .eq('id', orgId)

    if (updateError) {
      // Não bloqueia: o init_point já existe no MP.
      // O webhook sincronizará o status assim que o usuário pagar.
      console.error('create-subscription: failed to update org (non-fatal):', updateError)
    }

    // ── 7. Retornar init_point ──────────────────────────────────────────
    return jsonResponse({
      init_point:      preapproval.init_point,
      subscription_id: preapproval.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno inesperado'
    console.error('create-subscription: unhandled exception:', message)
    return jsonResponse({ error: message }, 500)
  }
})
