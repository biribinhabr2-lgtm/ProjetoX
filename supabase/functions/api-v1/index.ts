/**
 * api-v1 — API REST externa do FestaHub para integração com sistemas terceiros.
 *
 * Autenticação: header  Authorization: Bearer fh_live_<chave>
 *   1. Calcula SHA-256 da chave recebida.
 *   2. Busca em api_keys por key_hash WHERE revoked_at IS NULL (service role).
 *   3. Resolve org_id — TODAS as queries usam este org_id como filtro obrigatório.
 *   4. Atualiza last_used_at de forma assíncrona (fire-and-forget).
 *
 * Rate limit: 60 req/min por chave (em memória, resetado a cada minuto).
 * verify_jwt = false — autenticação própria via API key.
 *
 * Rotas:
 *   GET  /api-v1/events                   lista festas (from, to, status, limit, offset)
 *   GET  /api-v1/events/:id               detalhe de uma festa
 *   POST /api-v1/events                   cria festa
 *   PATCH /api-v1/events/:id              atualiza festa (campos permitidos)
 *   GET  /api-v1/customers                lista clientes (search, limit, offset)
 *
 * Formato de resposta: { data: ... } ou { error: "..." }
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS para chamadas server-to-server ──────────────────────────────────────
// Liberado para todas as origens: a autenticação é feita pela API Key, não pela Origin.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type':                 'application/json',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

// ── SHA-256 (Web Crypto) ─────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Rate limiter em memória (por key_hash, 60 req/min) ───────────────────────
interface RateBucket { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()
const RATE_LIMIT   = 60
const RATE_WINDOW  = 60_000 // ms

function checkRateLimit(keyHash: string): boolean {
  const now    = Date.now()
  const bucket = rateBuckets.get(keyHash)
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(keyHash, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (bucket.count >= RATE_LIMIT) return false
  bucket.count++
  return true
}

// ── Autenticação via API Key ─────────────────────────────────────────────────
interface AuthResult {
  orgId:   string
  keyHash: string
}

async function authenticate(
  req: Request,
  admin: SupabaseClient,
): Promise<AuthResult | Response> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer fh_live_')) {
    return json({ error: 'Authorization header inválido. Use: Bearer fh_live_<chave>' }, 401)
  }
  const key     = auth.slice(7) // remove 'Bearer '
  const keyHash = await sha256(key)

  // Rate limit por hash (antes da query ao banco)
  if (!checkRateLimit(keyHash)) {
    return json({ error: 'Rate limit excedido. Máximo 60 requisições por minuto.' }, 429)
  }

  // Busca a chave no banco (SOMENTE ativas: revoked_at IS NULL)
  const { data, error } = await admin
    .from('api_keys')
    .select('id, org_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    console.error('api-v1: auth query error:', error)
    return json({ error: 'Erro interno ao verificar chave' }, 500)
  }
  if (!data) {
    return json({ error: 'Chave de API inválida ou revogada' }, 401)
  }

  // Atualiza last_used_at de forma assíncrona — não bloqueia a resposta
  void admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id as string)

  return { orgId: data.org_id as string, keyHash }
}

// ── Validação de campos de evento ────────────────────────────────────────────
const VALID_STATUSES = new Set(['orcamento', 'confirmada', 'realizada', 'cancelada'])

function validateEventCreate(body: Record<string, unknown>): string | null {
  if (!body.customer_id && !body.title) return 'Informe customer_id ou title'
  if (!body.date) return 'Campo date obrigatório (YYYY-MM-DD)'
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return 'Formato de date inválido. Use YYYY-MM-DD'
  }
  if (body.status && !VALID_STATUSES.has(body.status as string)) {
    return `status inválido. Valores aceitos: ${[...VALID_STATUSES].join(', ')}`
  }
  if (body.total_cents !== undefined && !Number.isInteger(body.total_cents)) {
    return 'total_cents deve ser inteiro'
  }
  return null
}

// Campos que o sistema externo pode alterar via PATCH
const PATCHABLE_EVENT_FIELDS = new Set([
  'date', 'start_time', 'end_time', 'status',
  'guests_count', 'total_cents', 'deposit_cents', 'deposit_paid', 'notes', 'title',
])

function pickPatchableFields(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE_EVENT_FIELDS.has(k)) patch[k] = v
  }
  if (Object.keys(patch).length === 0) return null
  if (patch.status && !VALID_STATUSES.has(patch.status as string)) return null
  return patch
}

// ── Select padrão para eventos ───────────────────────────────────────────────
// customer: join necessário para retornar dados do cliente
const EVENT_SELECT = `
  id, title, date, start_time, end_time, status,
  guests_count, total_cents, deposit_cents, deposit_paid, notes, updated_at,
  customer:customers(id, name, phone)
`.trim()

// Nota: updated_at não existe no schema base — campo created_at substituído.
// Usamos created_at como fallback pois updated_at pode não existir.
const EVENT_SELECT_SAFE = `
  id, title, date, start_time, end_time, status,
  guests_count, total_cents, deposit_cents, deposit_paid, notes, created_at,
  customer:customers(id, name, phone)
`.trim()

// ── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Configuração interna incompleta' }, 500)
  }

  // Client com service role: bypassa RLS — o filtro org_id é responsabilidade desta função
  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── Autenticação ────────────────────────────────────────────────────────
  const authResult = await authenticate(req, admin)
  if (authResult instanceof Response) return authResult
  const { orgId } = authResult

  // ── Roteamento ──────────────────────────────────────────────────────────
  const url      = new URL(req.url)
  // pathname exemplo: /api-v1/events ou /api-v1/events/uuid
  const segments = url.pathname.replace(/^\/api-v1\/?/, '').split('/').filter(Boolean)
  const resource = segments[0] ?? ''   // 'events' | 'customers'
  const resourceId = segments[1]       // uuid opcional

  // ═══════════════════════════════════════════════════════════════════════
  //  /api-v1/events
  // ═══════════════════════════════════════════════════════════════════════
  if (resource === 'events') {

    // ── GET /api-v1/events ─────────────────────────────────────────────
    if (req.method === 'GET' && !resourceId) {
      const from    = url.searchParams.get('from')
      const to      = url.searchParams.get('to')
      const status  = url.searchParams.get('status')
      const limit   = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100)
      const offset  = parseInt(url.searchParams.get('offset') ?? '0', 10)

      // SEGURANÇA: org_id filtrado primeiro — invariante de toda query
      let q = admin
        .from('events')
        .select(EVENT_SELECT_SAFE)
        .eq('org_id', orgId)   // ← filtro obrigatório de org
        .order('date', { ascending: true })
        .range(offset, offset + limit - 1)

      if (from) q = q.gte('date', from)
      if (to)   q = q.lte('date', to)
      if (status && VALID_STATUSES.has(status)) q = q.eq('status', status)

      const { data, error } = await q
      if (error) {
        console.error('api-v1 GET /events:', error)
        return json({ error: 'Erro ao listar eventos' }, 500)
      }
      return json({ data, meta: { limit, offset, count: (data ?? []).length } })
    }

    // ── GET /api-v1/events/:id ─────────────────────────────────────────
    if (req.method === 'GET' && resourceId) {
      // SEGURANÇA: org_id filtrado junto com id — impede acesso cross-tenant
      const { data, error } = await admin
        .from('events')
        .select(EVENT_SELECT_SAFE)
        .eq('id', resourceId)
        .eq('org_id', orgId)   // ← filtro obrigatório de org
        .maybeSingle()

      if (error) return json({ error: 'Erro ao buscar evento' }, 500)
      if (!data)  return json({ error: 'Evento não encontrado' }, 404)
      return json({ data })
    }

    // ── POST /api-v1/events ────────────────────────────────────────────
    if (req.method === 'POST' && !resourceId) {
      let body: Record<string, unknown>
      try {
        body = await req.json() as Record<string, unknown>
      } catch {
        return json({ error: 'Body JSON inválido' }, 400)
      }

      const validationError = validateEventCreate(body)
      if (validationError) return json({ error: validationError }, 422)

      // Se customer_id não fornecido, criar cliente anônimo com title como nome
      let customerId = body.customer_id as string | undefined
      if (!customerId) {
        // SEGURANÇA: org_id injetado pelo servidor — não vem do cliente externo
        const { data: newCustomer, error: custErr } = await admin
          .from('customers')
          .insert({ org_id: orgId, name: body.title as string })   // ← org_id controlado
          .select('id')
          .single()
        if (custErr) return json({ error: 'Erro ao criar cliente' }, 500)
        customerId = (newCustomer as { id: string }).id
      } else {
        // Verifica que customer_id pertence à org (evita cross-tenant)
        const { data: cust } = await admin
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .eq('org_id', orgId)   // ← filtro obrigatório de org
          .maybeSingle()
        if (!cust) return json({ error: 'customer_id não encontrado nesta organização' }, 404)
      }

      // SEGURANÇA: org_id sempre injetado pelo servidor — nunca vem do payload externo
      const payload = {
        org_id:        orgId,         // ← sempre do servidor
        customer_id:   customerId,
        title:         body.title as string | undefined,
        date:          body.date as string,
        start_time:    body.start_time as string | undefined,
        end_time:      body.end_time as string | undefined,
        status:        (body.status as string | undefined) ?? 'orcamento',
        guests_count:  body.guests_count as number | undefined,
        total_cents:   (body.total_cents as number | undefined) ?? 0,
        deposit_cents: (body.deposit_cents as number | undefined) ?? 0,
        deposit_paid:  (body.deposit_paid as boolean | undefined) ?? false,
        notes:         body.notes as string | undefined,
      }

      const { data, error } = await admin
        .from('events')
        .insert(payload)
        .select(EVENT_SELECT_SAFE)
        .single()

      if (error) {
        console.error('api-v1 POST /events:', error)
        return json({ error: 'Erro ao criar evento' }, 500)
      }
      return json({ data }, 201)
    }

    // ── PATCH /api-v1/events/:id ───────────────────────────────────────
    if (req.method === 'PATCH' && resourceId) {
      let body: Record<string, unknown>
      try {
        body = await req.json() as Record<string, unknown>
      } catch {
        return json({ error: 'Body JSON inválido' }, 400)
      }

      const patch = pickPatchableFields(body)
      if (!patch) return json({ error: 'Nenhum campo válido para atualizar' }, 422)

      // SEGURANÇA: .eq('org_id', orgId) garante que só eventos da org podem ser alterados
      const { data, error } = await admin
        .from('events')
        .update(patch)
        .eq('id', resourceId)
        .eq('org_id', orgId)   // ← filtro obrigatório de org
        .select(EVENT_SELECT_SAFE)
        .single()

      if (error) {
        console.error('api-v1 PATCH /events:', error)
        return json({ error: 'Erro ao atualizar evento' }, 500)
      }
      if (!data) return json({ error: 'Evento não encontrado' }, 404)
      return json({ data })
    }

    return json({ error: 'Método não suportado' }, 405)
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  /api-v1/customers
  // ═══════════════════════════════════════════════════════════════════════
  if (resource === 'customers') {
    if (req.method !== 'GET') return json({ error: 'Método não suportado' }, 405)

    const search = url.searchParams.get('search') ?? ''
    const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

    // SEGURANÇA: org_id filtrado primeiro
    let q = admin
      .from('customers')
      .select('id, name, phone, email, child_name, child_birthdate, created_at')
      .eq('org_id', orgId)   // ← filtro obrigatório de org
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (search.trim()) {
      q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await q
    if (error) {
      console.error('api-v1 GET /customers:', error)
      return json({ error: 'Erro ao listar clientes' }, 500)
    }
    return json({ data, meta: { limit, offset, count: (data ?? []).length } })
  }

  // ── Rota não encontrada ──────────────────────────────────────────────────
  return json(
    { error: 'Rota não encontrada. Consulte a documentação em docs/API.md' },
    404,
  )
})
