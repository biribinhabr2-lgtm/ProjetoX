import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'
import { differenceInDays, parseISO } from 'date-fns'
import { useIsPlatformAdmin } from './useIsPlatformAdmin'

export type PlanFeature = 'public_quotes' | 'multiple_units' | 'multi_user'

interface UsePlanResult {
  plan: string
  isTrial: boolean
  trialDaysLeft: number
  isActive: boolean
  loading: boolean
  isSimulating: boolean
  can: (feature: PlanFeature) => boolean
}

export function usePlan(): UsePlanResult {
  const organization    = useAuthStore((s) => s.organization)
  const loading         = useAuthStore((s) => s.loading)
  const simulatedPlan   = useAdminStore((s) => s.simulatedPlan)
  const isPlatformAdmin = useIsPlatformAdmin()

  return useMemo(() => {
    if (loading || !organization) {
      return { plan: 'trial', isTrial: true, trialDaysLeft: 14, isActive: true, loading, isSimulating: false, can: () => false }
    }

    // Override de plano só válido quando o usuário realmente é platform admin
    const effectivePlan = (isPlatformAdmin && simulatedPlan) ? simulatedPlan : organization.plan
    const isSimulating  = isPlatformAdmin && !!simulatedPlan

    const { trial_ends_at, subscription_status } = organization
    const plan    = effectivePlan
    const isTrial = plan === 'trial'

    const trialDaysLeft = isTrial
      ? Math.max(0, differenceInDays(parseISO(trial_ends_at), new Date()))
      : 0

    // 'pending' = pagamento iniciado mas aguardando webhook do MP — não bloquear acesso
    const isActive = isSimulating
      ? true // admin simulando sempre ativo
      : isTrial
        ? trialDaysLeft > 0
        : subscription_status === 'active' || subscription_status === 'pending'

    function can(feature: PlanFeature): boolean {
      if (!isActive) return false
      if (feature === 'public_quotes') return plan !== 'essencial' && !isTrial
      if (feature === 'multiple_units') return plan === 'rede'
      if (feature === 'multi_user') return plan === 'profissional' || plan === 'rede'
      return true
    }

    return { plan, isTrial, trialDaysLeft, isActive, loading, isSimulating, can }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization, loading, simulatedPlan, isPlatformAdmin])
}
