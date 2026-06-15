/**
 * billing.ts — serviço de cobrança via Mercado Pago Assinaturas.
 *
 * Regra 4: toda comunicação com o backend passa por este módulo.
 * Regra 9: nenhum segredo aqui — o token MP vive nos Supabase Secrets,
 *          nunca no frontend.
 */

import { supabase } from '@/lib/supabase'

// ── Planos disponíveis (espelham os planos de organizations.plan) ─────────
export type BillingPlan = 'essencial' | 'profissional' | 'rede'

export interface PlanInfo {
  id:          BillingPlan
  label:       string
  priceMonthly: number   // em centavos (para exibição com fmtBRL)
  features:    string[]
}

export const PLANS: PlanInfo[] = [
  {
    id:           'essencial',
    label:        'Essencial',
    priceMonthly: 3990,   // R$ 39,90 em centavos
    features: [
      'Agenda de festas completa',
      'Módulo de clientes + radar de aniversários',
      'Orçamentos com link público',
      'Financeiro completo',
      '1 usuário',
    ],
  },
  {
    id:           'profissional',
    label:        'Profissional',
    priceMonthly: 6990,   // R$ 69,90 em centavos
    features: [
      'Tudo do Essencial',
      'Até 5 usuários',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
  {
    id:           'rede',
    label:        'Rede',
    priceMonthly: 10990,  // R$ 109,90 em centavos
    features: [
      'Tudo do Profissional',
      'Usuários ilimitados',
      'Múltiplas unidades',
      'API de integração',
    ],
  },
]

// ── Resposta da Edge Function ─────────────────────────────────────────────
interface CreateSubscriptionResponse {
  init_point:      string
  subscription_id: string
}

/**
 * Inicia uma nova assinatura para a organização do usuário logado.
 *
 * 1. Chama a Edge Function `create-subscription` com o JWT do usuário atual.
 * 2. A Edge Function valida permissão, cria o preapproval no MP e retorna
 *    o `init_point` (URL de checkout do Mercado Pago).
 * 3. Esta função redireciona o navegador para o checkout.
 *
 * O usuário volta para /app/configuracoes?sub=ok após concluir o pagamento.
 * O status da assinatura é atualizado pelo webhook `mp-webhook`.
 *
 * @throws Error se a Edge Function retornar erro
 */
export async function startSubscription(plan: BillingPlan): Promise<void> {
  const { data, error } = await supabase.functions.invoke<CreateSubscriptionResponse>(
    'create-subscription',
    { body: { plan } },
  )

  if (error) {
    // FunctionsHttpError tem message; outros tipos também
    const message = (error as { message?: string }).message ?? 'Erro ao iniciar assinatura'
    throw new Error(message)
  }

  if (!data?.init_point) {
    throw new Error('Resposta inválida da função de assinatura')
  }

  // Redireciona para o checkout do Mercado Pago (abre na mesma aba)
  window.location.href = data.init_point
}

/**
 * Retorna as informações de um plano pelo id.
 * Útil para exibir nome e preço na UI sem repetir os dados.
 */
export function getPlanInfo(planId: string): PlanInfo | undefined {
  return PLANS.find((p) => p.id === planId)
}
