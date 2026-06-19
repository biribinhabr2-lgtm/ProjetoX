/**
 * email.ts — dispara e-mails transacionais via Edge Function send-email.
 *
 * Regra 4: todas as chamadas a Edge Functions passam por aqui.
 * O RESEND_API_KEY NUNCA toca o bundle do frontend — fica exclusivamente
 * no servidor como Supabase Secret.
 *
 * Padrão fire-and-forget: erros são logados em warn, nunca lançados,
 * para não bloquear o fluxo principal (onboarding, aceite de orçamento).
 * A Edge Function sempre retorna HTTP 200 — erros de envio chegam via
 * { ok: true, emailed: false, reason: "..." }.
 */

import { supabase } from '@/lib/supabase'

type EmailTemplate = 'boas-vindas' | 'trial-acabando' | 'orcamento-aceito'

interface SendEmailPayload {
  to?: string
  template: EmailTemplate
  data: Record<string, string>
  /** Obrigatório para orcamento-aceito: UUID público do orçamento */
  quote_token?: string
}

export async function sendEmail(payload: SendEmailPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })

  if (error) {
    // Não deve ocorrer com a versão atual da Edge Function (sempre retorna 200),
    // mas protege caso haja erro de rede ou timeout.
    console.warn('[email] invocação falhou', payload.template, error.message)
    return
  }

  if (data && data.emailed === false) {
    console.warn('[email] e-mail não enviado', payload.template, data.reason ?? '')
  }
}
