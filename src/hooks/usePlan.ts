import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { differenceInDays, parseISO } from 'date-fns'

export type PlanFeature = 'public_quotes' | 'multiple_units' | 'multi_user'

interface UsePlanResult {
  plan: string
  isTrial: boolean
  trialDaysLeft: number
  isActive: boolean
  loading: boolean
  can: (feature: PlanFeature) => boolean
}

export function usePlan(): UsePlanResult {
  const organization = useAuthStore((s) => s.organization)
  const loading = useAuthStore((s) => s.loading)

  return useMemo(() => {
    // Enquanto carregando, não sabemos o plano — tratar como ativo para evitar redirect prematuro
    if (loading || !organization) {
      return { plan: 'trial', isTrial: true, trialDaysLeft: 14, isActive: true, loading, can: () => false }
    }

    const { plan, trial_ends_at, subscription_status } = organization

    const isTrial = plan === 'trial'

    const trialDaysLeft = isTrial
      ? Math.max(0, differenceInDays(parseISO(trial_ends_at), new Date()))
      : 0

    // 'pending' = pagamento iniciado mas aguardando webhook do MP — não bloquear acesso
    const isActive = isTrial
      ? trialDaysLeft > 0
      : subscription_status === 'active' || subscription_status === 'pending'

    function can(feature: PlanFeature): boolean {
      if (!isActive) return false
      if (feature === 'public_quotes') return plan !== 'essencial' && !isTrial
      if (feature === 'multiple_units') return plan === 'rede'
      if (feature === 'multi_user') return plan === 'profissional' || plan === 'rede'
      return true
    }

    return { plan, isTrial, trialDaysLeft, isActive, loading, can }
  }, [organization, loading])
}
