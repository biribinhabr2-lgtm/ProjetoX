/**
 * email.ts — dispara e-mails transacionais via Edge Function send-email.
 *
 * Regra 4: todas as chamadas a Edge Functions passam por aqui.
 * O RESEND_API_KEY NUNCA toca o bundle do frontend — fica exclusivamente
 * no servidor como Supabase Secret.
 *
 * Padrão fire-and-forget: erros são logados, não lançados, para não
 * bloquear o fluxo principal (onboarding, aceite de orçamento).
 */

import { supabase } from '@/lib/supabase'

type EmailTemplate = 'boas-vindas' | 'trial-acabando' | 'orcamento-aceito'

interface SendEmailPayload {
  to?: string
  template: EmailTemplate
  data: Record<string, string>
}

export async function sendEmail(payload: SendEmailPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })

  if (error) {
    // Fire-and-forget: loga mas não propaga — nunca bloqueia o fluxo do usuário.
    console.warn('[email] falha ao enviar', payload.template, error.message)
  }
}
