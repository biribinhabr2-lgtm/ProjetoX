/**
 * CORS para Edge Functions chamadas pelo frontend (create-subscription, create-api-key).
 * O webhook do MP e a api-v1 são server-to-server — não usam este módulo.
 *
 * Origens permitidas: produção + Vercel previews + localhost de dev.
 * APP_URL é lida do ambiente em tempo de execução.
 */

const ALWAYS_ALLOWED = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://projeto-x-vert.vercel.app',
]

function getAllowedOrigins(): string[] {
  const appUrl = Deno.env.get('APP_URL')
  return appUrl ? [...ALWAYS_ALLOWED, appUrl] : ALWAYS_ALLOWED
}

function resolveOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return ALWAYS_ALLOWED[0]
  const allowed = getAllowedOrigins()
  // Permite também subdomínios da Vercel (deploys de preview)
  const isVercelPreview = requestOrigin.endsWith('.vercel.app')
  return allowed.includes(requestOrigin) || isVercelPreview
    ? requestOrigin
    : allowed[allowed.length - 1] // fallback: produção
}

function makeCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  resolveOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary':                         'Origin',
  }
}

/** Resposta padrão para preflight OPTIONS */
export function corsPreflightResponse(req?: Request): Response {
  const origin = req?.headers.get('Origin') ?? null
  return new Response(null, { status: 204, headers: makeCorsHeaders(origin) })
}

/** Envelopa um payload JSON com CORS e Content-Type */
export function jsonResponse(
  body:   unknown,
  status  = 200,
  extra:  Record<string, string> = {},
  req?:   Request,
): Response {
  const origin = req?.headers.get('Origin') ?? null
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...makeCorsHeaders(origin),
      'Content-Type': 'application/json',
      ...extra,
    },
  })
}

// Mantido para compatibilidade com código existente que não passa `req`
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
