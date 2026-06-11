/**
 * mp-webhook — recebe notificações do Mercado Pago sobre assinaturas (preapproval).
 *
 * verify_jwt = false (ver supabase/config.toml) — endpoint público, pois o MP
 * não envia cabeçalho Authorization nas notificações.
 *
 * Modelo de segurança:
 *   NUNCA confiamos nos dados do corpo do webhook para aplicar mudanças.
 *   Ao receber uma notificação com um subscription_id, SEMPRE buscamos o
 *   preapproval na API do MP (/preapproval/{id}) para verificar que ele existe
 *   e obter o status real. Só então atualizamos o banco.
 *
 * Formatos de notificação suportados:
 *   - v1 (atual):   { type: "subscription_preapproval", data: { id: "..." }, ... }
 *   - legado:       { topic: "preapproval", id: "..." }
 *
 * Mapeamento de status:
 *   authorized → active
 *   paused     → inactive
 *   cancelled  → inactive
 *   pending    → pending
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mpFetch, type MpPreapproval } from '../_shared/mp-api.ts'

// ── Mapeamento de status MP → subscription_status do FestaHub ────────────
const STATUS_MAP: Record<string, string> = {
  authorized: 'active',
  paused:     'inactive',
  cancelled:  'inactive',
  pending:    'pending',
}

// ── Tipos de notificação do MP ────────────────────────────────────────────

interface MpNotificationV1 {
  action:      string
  api_version: string
  data:        { id: string }
  type:        string
  live_mode:   boolean
}

interface MpNotificationLegacy {
  topic: string
  id:    string
}

// ── Type guards ───────────────────────────────────────────────────────────

function isNotificationV1(v: unknown): v is MpNotificationV1 {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj['type'] === 'string' &&
    typeof obj['data'] === 'object' &&
    obj['data'] !== null &&
    typeof (obj['data'] as Record<string, unknown>)['id'] === 'string'
  )
}

function isNotificationLegacy(v: unknown): v is MpNotificationLegacy {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj['topic'] === 'string' &&
    typeof obj['id'] === 'string'
  )
}

// ── Handler principal ─────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  // O MP faz GET de verificação ao cadastrar o webhook
  if (req.method === 'GET') {
    return new Response('OK', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Responder 200 IMEDIATAMENTE — o MP exige resposta em < 5 s
  // O processamento real acontece de forma assíncrona abaixo.
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    // Body vazio ou inválido (health checks do MP, por exemplo) — ignorar
    console.log('mp-webhook: received non-JSON body, ignoring')
    return new Response('OK', { status: 200 })
  }

  // Processa em background sem bloquear a resposta
  void processWebhook(rawBody).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('mp-webhook: unhandled background error:', msg)
  })

  return new Response('OK', { status: 200 })
})

// ── Processamento assíncrono ──────────────────────────────────────────────

async function processWebhook(rawBody: unknown): Promise<void> {
  // ── Carregar env vars ─────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken  = Deno.env.get('MP_ACCESS_TOKEN')

  if (!supabaseUrl || !serviceRoleKey || !mpAccessToken) {
    console.error('mp-webhook: missing env vars — aborting')
    return
  }

  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── Extrair subscription id ───────────────────────────────────────────
  let subscriptionId: string | null = null

  if (isNotificationV1(rawBody)) {
    if (rawBody.type === 'subscription_preapproval') {
      subscriptionId = rawBody.data.id
    } else {
      // Outro tipo de evento (payment, charge_back, etc.) — não é nossa área
      console.log('mp-webhook: ignoring event type:', rawBody.type)
      return
    }
  } else if (isNotificationLegacy(rawBody)) {
    if (rawBody.topic === 'preapproval') {
      subscriptionId = rawBody.id
    } else {
      console.log('mp-webhook: ignoring legacy topic:', rawBody.topic)
      return
    }
  } else {
    // Formato desconhecido — logar para investigação
    console.warn('mp-webhook: unrecognized payload format:', JSON.stringify(rawBody).slice(0, 200))
    return
  }

  if (!subscriptionId) {
    console.warn('mp-webhook: subscription id not found in payload')
    return
  }

  // ── Verificar assinatura na API do MP (passo de segurança crítico) ────
  // Nunca usamos os dados do body do webhook para atualizar o banco.
  // Buscamos o preapproval diretamente do MP para garantir autenticidade.
  const mpResult = await mpFetch<MpPreapproval>(
    `/preapproval/${subscriptionId}`,
    { method: 'GET' },
    mpAccessToken,
  )

  if (!mpResult.ok) {
    console.error(
      `mp-webhook: failed to verify preapproval ${subscriptionId}:`,
      mpResult.status,
      mpResult.message,
    )
    // Não atualizamos nada — possível tentativa de manipulação
    return
  }

  const preapproval = mpResult.data

  // ── Validar external_reference (deve ser um UUID de organização) ──────
  const orgId = preapproval.external_reference
  if (!orgId || typeof orgId !== 'string' || orgId.length < 10) {
    console.error('mp-webhook: preapproval has invalid external_reference:', orgId)
    return
  }

  // ── Mapear status do MP → nosso sistema ──────────────────────────────
  const newStatus = STATUS_MAP[preapproval.status] ?? 'pending'

  // ── Verificar que a organização existe antes de atualizar ─────────────
  const { data: orgRows, error: orgFetchErr } = await admin
    .from('organizations')
    .select('id, plan')
    .eq('id', orgId)
    .limit(1)

  if (orgFetchErr) {
    console.error('mp-webhook: error fetching org:', orgFetchErr)
    return
  }

  // orgRows é um array quando usamos .select() sem .single()
  const orgList = orgRows as Array<{ id: string; plan: string }> | null
  if (!orgList || orgList.length === 0) {
    console.error('mp-webhook: organization not found for external_reference:', orgId)
    return
  }

  // ── Atualizar subscription_status na organização ──────────────────────
  // Não alteramos `plan` aqui — ele foi definido em create-subscription.
  // O status do MP é a única fonte de verdade para ativar/desativar o acesso.
  const { error: updateError } = await admin
    .from('organizations')
    .update({
      subscription_status: newStatus,
      subscription_id:     preapproval.id,   // garante consistência
    })
    .eq('id', orgId)

  if (updateError) {
    console.error('mp-webhook: failed to update organization:', updateError)
    return
  }

  // ── Registrar no audit_log ─────────────────────────────────────────────
  await writeAuditLog(admin, orgId, 'mp_webhook_processed', {
    subscription_id: preapproval.id,
    mp_status:       preapproval.status,
    our_status:      newStatus,
    reason:          preapproval.reason,
  })

  console.log(
    `mp-webhook: ✓ org=${orgId} subscription=${preapproval.id}`,
    `mp_status=${preapproval.status} → our_status=${newStatus}`,
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function writeAuditLog(
  admin:    SupabaseClient,
  orgId:    string,
  action:   string,
  payload:  Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.from('audit_log').insert({
    org_id:    orgId,
    user_id:   null,          // ação automática, sem usuário
    action,
    entity:    'subscription',
    entity_id: (payload['subscription_id'] as string | undefined) ?? null,
    payload,
  })

  if (error) {
    // Não propaga erro — audit log é melhor-esforço
    console.error('mp-webhook: failed to write audit_log:', error)
  }
}
