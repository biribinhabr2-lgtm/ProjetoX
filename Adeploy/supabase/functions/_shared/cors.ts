/**
 * Cabeçalhos CORS para Edge Functions chamadas pelo frontend.
 * O webhook do MP não precisa de CORS — é server-to-server.
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Resposta padrão para preflight OPTIONS */
export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}

/** Envelopa um payload JSON com CORS e Content-Type */
export function jsonResponse(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extra,
    },
  })
}
