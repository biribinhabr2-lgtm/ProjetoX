/**
 * create-api-key — gera uma API Key para a organização do usuário logado.
 *
 * Fluxo:
 *  1. Valida JWT → resolve user_id.
 *  2. Verifica que o usuário é owner/admin da organização.
 *  3. Verifica que o plano é profissional ou rede.
 *  4. Gera 'fh_live_' + 32 bytes aleatórios (hex) = 72 chars total.
 *  5. Calcula SHA-256 da chave completa (Web Crypto API).
 *  6. Persiste (org_id, name, key_prefix, key_hash) via service role.
 *  7. Retorna a chave completa UMA ÚNICA VEZ — nunca mais recuperável.
 *
 * A chave NUNCA é armazenada em texto puro. Somente o hash.
 *
 * verify_jwt = true (padrão) — requer usuário autenticado.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, corsPreflightResponse, jsonResponse } from '../_shared/cors.ts'

const PREFIX = 'fh_live_'

/** Gera N bytes aleatórios como string hex */
function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 de uma string (Web Crypto — sem dependência externa) */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

interface RequestBody {
  name: string
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsPreflightResponse()
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Configuração interna incompleta' }, 500)
    }

    // ── 1. Verificar JWT ──────────────────────────────────────────────────
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
      return jsonResponse({ error: 'Token inválido ou expirado' }, 401)
    }

    // ── 2. Validar body ───────────────────────────────────────────────────
    let body: RequestBody
    try {
      body = await req.json() as RequestBody
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }
    const name = (body.name ?? '').trim()
    if (!name || name.length < 2) {
      return jsonResponse({ error: 'Nome da chave obrigatório (mínimo 2 caracteres)' }, 400)
    }
    if (name.length > 80) {
      return jsonResponse({ error: 'Nome muito longo (máximo 80 caracteres)' }, 400)
    }

    // ── 3. Verificar membership owner/admin e plano ───────────────────────
    const { data: membership, error: membershipError } = await admin
      .from('memberships')
      .select('org_id, role, organizations(plan)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle()

    if (membershipError) {
      console.error('create-api-key: membership error:', membershipError)
      return jsonResponse({ error: 'Erro ao verificar permissão' }, 500)
    }
    if (!membership) {
      return jsonResponse({ error: 'Usuário sem permissão (requer owner ou admin)' }, 403)
    }

    const orgId = membership.org_id as string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- join dinâmico do Supabase
    const orgPlan = (membership as any).organizations?.plan as string | undefined
    if (orgPlan !== 'profissional' && orgPlan !== 'rede') {
      return jsonResponse(
        { error: 'API Keys disponíveis apenas nos planos Profissional e Rede' },
        403,
      )
    }

    // ── 4. Gerar chave ────────────────────────────────────────────────────
    // Formato: fh_live_ (8) + 64 chars hex (32 bytes) = 72 chars total
    const rawSuffix = randomHex(32)
    const fullKey   = PREFIX + rawSuffix
    // Primeiros 8 chars do sufixo para exibição futura (ex.: "a1b2c3d4")
    const keyPrefix = rawSuffix.slice(0, 8)

    // ── 5. Calcular hash ─────────────────────────────────────────────────
    const keyHash = await sha256(fullKey)

    // ── 6. Persistir (sem armazenar a chave em texto puro) ────────────────
    const { error: insertError } = await admin
      .from('api_keys')
      .insert({ org_id: orgId, name, key_prefix: keyPrefix, key_hash: keyHash })

    if (insertError) {
      console.error('create-api-key: insert error:', insertError)
      return jsonResponse({ error: 'Erro ao salvar chave' }, 500)
    }

    // ── 7. Retornar chave completa UMA ÚNICA VEZ ─────────────────────────
    return jsonResponse({ key: fullKey, key_prefix: keyPrefix, name }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('create-api-key: unhandled:', message)
    return jsonResponse({ error: message }, 500)
  }
})
