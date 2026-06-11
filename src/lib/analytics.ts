/**
 * analytics.ts — wrapper tipado sobre @vercel/analytics.
 *
 * Escolha: Vercel Analytics
 * - Gratuito no plano Hobby/Pro da Vercel
 * - Zero cookies — usa apenas dados do servidor (IP, user-agent) de forma agregada
 * - Sem fingerprinting, sem cross-site tracking → LGPD-compliant out of the box
 * - Não requer banner de cookies para eventos de produto
 * - Integração nativa com o dashboard de deploy da Vercel
 *
 * Eventos rastreados:
 *   cadastro_iniciado      — formulário de cadastro submetido
 *   onboarding_concluido   — org criada com sucesso
 *   primeira_festa_criada  — primeira festa da org
 *   clique_assinar         — clique no botão de um plano
 *   assinatura_concluida   — retorno com ?sub=ok após pagamento MP
 */

import { track } from '@vercel/analytics'

export function trackCadastroIniciado() {
  void track('cadastro_iniciado')
}

export function trackOnboardingConcluido(plan: string = 'trial') {
  void track('onboarding_concluido', { plan })
}

export function trackPrimeiraFestaCriada() {
  void track('primeira_festa_criada')
}

export function trackCliqueAssinar(planId: string) {
  void track('clique_assinar', { plan: planId })
}

export function trackAssinaturaConcluida(planId?: string) {
  void track('assinatura_concluida', planId ? { plan: planId } : undefined)
}
