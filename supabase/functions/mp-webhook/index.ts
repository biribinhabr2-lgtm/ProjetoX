/**
 * mp-webhook — recebe notificações do Mercado Pago sobre assinaturas (preapproval).
 *
 * verify_jwt = false — endpoint público (MP não envia JWT).
 *
 * Segurança em camadas:
 *  1. Validação HMAC-SHA256 da assinatura x-signature (se MP_WEBHOOK_SECRET configurado).
 *  2. Idempotência: tabela mp_webhook_events evita processar o mesmo evento duas vezes.
 *  3. Verificação do preapproval direto na API do MP — nunca confia no body da notificação.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mpFetch, type MpPreapproval } from '../_shared/mp-api.ts'

const STATUS_MAP: Record<string, string> = {
  authorized: 'active',
  paused:     'inactive',
  cancelled:  'inactive',
  pending:    'pending',
}

// ── HMAC-SHA256 (Web Crypto) ──────────────────────────────────────────────────

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Comparação em tempo constante para evitar timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Valida o header x-signature do Mercado Pago.
 * Formato: ts=<timestamp>,v1=<hmac>
 * Mensagem: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
async function validateMpSignature(
  headers:       Headers,
  dataId:        string,
  webhookSecret: string,
): Promise<boolean> {
  const xSig       = headers.get('x-signature') ?? ''
  const xRequestId = headers.get('x-request-id') ?? ''

  if (!xSig) {
    console.warn('mp-webhook: x-signature ausente')
    return false
  }

  const tsMatch = xSig.match(/ts=([^,]+)/)
  const v1Match = xSig.match(/v1=([^,]+)/)
  if (!tsMatch || !v1Match) {
    console.warn('mp-webhook: x-signature formato inválido:', xSig)
    return false
  }

  const message  = `id:${dataId};request-id:${xRequestId};ts:${tsMatch[1]};`
  const expected = await hmacSha256(webhookSecret, message)

  const ok = timingSafeEqual(v1Match[1], expected)
  if (!ok) console.warn('mp-webhook: HMAC inválido para:', message)
  return ok
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

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

function isNotificationV1(v: unknown): v is MpNotificationV1 {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj['type'] === 'string' &&
    typeof obj['data'] === 'object' && obj['data'] !== null &&
    typeof (obj['data'] as Record<string, unknown>)['id'] === 'string'
  )
}

function isNotificationLegacy(v: unknown): v is MpNotificationLegacy {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return typeof obj['topic'] === 'string' && typeof obj['id'] === 'string'
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'GET') return new Response('OK', { status: 200 })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    console.log('mp-webhook: body não-JSON, ignorando')
    return new Response('OK', { status: 200 })
  }

  // Extrai ID e captura headers antes do processamento em background
  let earlySubId: string | null = null
  if (isNotificationV1(rawBody) && rawBody.type === 'subscription_preapproval') {
    earlySubId = rawBody.data.id
  } else if (isNotificationLegacy(rawBody) && rawBody.topic === 'preapproval') {
    earlySubId = rawBody.id
  }

  // Headers precisam ser capturados antes de retornar a resposta
  const headersSnapshot = new Headers(req.headers)

  void processWebhook(rawBody, earlySubId, headersSnapshot).catch((err: unknown) => {
    console.error('mp-webhook: erro não tratado:', err instanceof Error ? err.message : String(err))
  })

  return new Response('OK', { status: 200 })
})

// ── Processamento assíncrono ──────────────────────────────────────────────────

async function processWebhook(
  rawBody:  unknown,
  subId:    string | null,
  headers:  Headers,
): Promise<void> {
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken  = Deno.env.get('MP_ACCESS_TOKEN')
  const webhookSecret  = Deno.env.get('MP_WEBHOOK_SECRET')

  if (!supabaseUrl || !serviceRoleKey || !mpAccessToken) {
    console.error('mp-webhook: env vars ausentes')
    return
  }

  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── 1. Validação HMAC ─────────────────────────────────────────────────────
  if (webhookSecret && subId) {
    const valid = await validateMpSignature(headers, subId, webhookSecret)
    if (!valid) {
      console.error('mp-webhook: assinatura inválida — rejeitando')
      return
    }
  } else if (!webhookSecret) {
    console.warn('mp-webhook: MP_WEBHOOK_SECRET não configurado — sem validação HMAC')
  }

  // ── 2. Extrair subscription_id ────────────────────────────────────────────
  let subscriptionId: string | null = null

  if (isNotificationV1(rawBody)) {
    if (rawBody.type === 'subscription_preapproval') subscriptionId = rawBody.data.id
    else { console.log('mp-webhook: tipo ignorado:', rawBody.type); return }
  } else if (isNotificationLegacy(rawBody)) {
    if (rawBody.topic === 'preapproval') subscriptionId = rawBody.id
    else { console.log('mp-webhook: tópico ignorado:', rawBody.topic); return }
  } else {
    console.warn('mp-webhook: formato desconhecido:', JSON.stringify(rawBody).slice(0, 200))
    return
  }

  if (!subscriptionId) { console.warn('mp-webhook: subscription_id ausente'); return }

  // ── 3. Verificar na API do MP (fonte de verdade) ──────────────────────────
  const mpResult = await mpFetch<MpPreapproval>(
    `/preapproval/${subscriptionId}`,
    { method: 'GET' },
    mpAccessToken,
  )

  if (!mpResult.ok) {
    console.error(`mp-webhook: falha ao verificar ${subscriptionId}:`, mpResult.status, mpResult.message)
    return
  }

  const preapproval = mpResult.data
  const mpStatus    = preapproval.status
  const newStatus   = STATUS_MAP[mpStatus] ?? 'pending'

  // ── 4. IDEMPOTÊNCIA ───────────────────────────────────────────────────────
  const { error: idempErr } = await admin
    .from('mp_webhook_events')
    .insert({ subscription_id: subscriptionId, mp_status: mpStatus })

  if (idempErr) {
    if (idempErr.code === '23505') {
      console.log(`mp-webhook: já processado (${subscriptionId}, ${mpStatus}) — ignorando`)
      return
    }
    // Erro inesperado: continua para não perder o evento
    console.warn('mp-webhook: erro ao registrar idempotency:', idempErr.message)
  }

  // ── 5. Validar external_reference ────────────────────────────────────────
  const orgId = preapproval.external_reference
  if (!orgId || typeof orgId !== 'string' || orgId.length < 10) {
    console.error('mp-webhook: external_reference inválido:', orgId)
    return
  }

  // ── 6. Verificar org existe ───────────────────────────────────────────────
  const { data: orgRows, error: orgErr } = await admin
    .from('organizations')
    .select('id, plan')
    .eq('id', orgId)
    .limit(1)

  if (orgErr) { console.error('mp-webhook: erro ao buscar org:', orgErr); return }

  const orgList = orgRows as Array<{ id: string; plan: string }> | null
  if (!orgList?.length) { console.error('mp-webhook: org não encontrada:', orgId); return }

  // ── 7. Atualizar status ───────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from('organizations')
    .update({ subscription_status: newStatus, subscription_id: preapproval.id })
    .eq('id', orgId)

  if (updateErr) { console.error('mp-webhook: falha ao atualizar org:', updateErr); return }

  // ── 8. Auditoria ──────────────────────────────────────────────────────────
  await admin.from('audit_log').insert({
    org_id: orgId, user_id: null, action: 'mp_webhook_processed',
    entity: 'subscription', entity_id: null,
    payload: { subscription_id: preapproval.id, mp_status: mpStatus, our_status: newStatus, reason: preapproval.reason },
  })

  console.log(`mp-webhook: ✓ org=${orgId} sub=${preapproval.id} mp=${mpStatus} → ${newStatus}`)
}
