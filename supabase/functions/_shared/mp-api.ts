/**
 * mp-api.ts — tipos da API do Mercado Pago e fetcher genérico.
 *
 * Nunca inclui o token aqui — quem chama passa `accessToken` como parâmetro.
 * Referência: https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post
 */

// ── Tipos de request ──────────────────────────────────────────────────────

export interface MpAutoRecurring {
  /** Periodicidade (ex: 1) */
  frequency:          number
  /** Unidade da periodicidade */
  frequency_type:     'months' | 'days'
  /** Valor da cobrança em reais (float — é a API do MP, não nosso banco) */
  transaction_amount: number
  /** Moeda: 'BRL' */
  currency_id:        string
  /** Data de início em ISO 8601 (opcional) */
  start_date?:        string
  /** Data de término em ISO 8601 (opcional) */
  end_date?:          string
}

export interface MpPreapprovalCreateBody {
  /** Descrição da assinatura, exibida no checkout */
  reason:             string
  /** Dados da recorrência */
  auto_recurring:     MpAutoRecurring
  /** URL de retorno após conclusão */
  back_url:           string
  /** Referência externa — usamos o org_id */
  external_reference: string
  /** E-mail do pagador (obrigatório pela API do MP) */
  payer_email:        string
  /** Status inicial (omitir = pending) */
  status?:            string
}

// ── Tipos de resposta ─────────────────────────────────────────────────────

export interface MpPreapproval {
  id:                 string
  /** authorized | paused | cancelled | pending */
  status:             string
  external_reference: string | null
  /** URL de checkout — redirecionar o usuário para cá */
  init_point:         string
  reason:             string
  auto_recurring:     MpAutoRecurring
  payer_email:        string
  created_date:       string
  last_modified_date: string
}

export interface MpApiError {
  message: string
  error:   string
  status:  number
  cause:   Array<{ code: number; description: string; data: null }>
}

// ── Resultado tipado do fetcher ───────────────────────────────────────────

export type MpResult<T> =
  | { ok: true;  data: T }
  | { ok: false; status: number; message: string }

// ── Fetcher ───────────────────────────────────────────────────────────────

const MP_BASE = 'https://api.mercadopago.com'

/**
 * Faz uma chamada autenticada à API do Mercado Pago.
 *
 * @param path        Caminho relativo, ex: '/preapproval' ou '/preapproval/{id}'
 * @param options     Opções do fetch (method, body, etc.)
 * @param accessToken Token de acesso MP (lido do env pelo caller)
 */
export async function mpFetch<T>(
  path:        string,
  options:     RequestInit,
  accessToken: string,
): Promise<MpResult<T>> {
  const url = `${MP_BASE}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Authorization':    `Bearer ${accessToken}`,
        'Content-Type':     'application/json',
        // Idempotência: evita cobranças duplicadas em retry
        'X-Idempotency-Key': crypto.randomUUID(),
        ...(options.headers ?? {}),
      },
    })
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error'
    return { ok: false, status: 0, message: `Falha de rede ao chamar MP: ${msg}` }
  }

  if (!res.ok) {
    let message = `MP API HTTP ${res.status}`
    try {
      const errBody = await res.json() as MpApiError
      if (errBody.message) message = errBody.message
    } catch {
      // parse de erro falhou — mantém mensagem genérica
    }
    return { ok: false, status: res.status, message }
  }

  try {
    const data = await res.json() as T
    return { ok: true, data }
  } catch {
    return { ok: false, status: res.status, message: 'Resposta MP não é JSON válido' }
  }
}
