import { create } from 'zustand'

interface AdminState {
  /** null = ainda não verificado; false = não é admin; true = é admin */
  isPlatformAdmin: boolean | null
  /** null = sem simulação ativa; string = plano simulado */
  simulatedPlan: string | null

  setIsPlatformAdmin: (val: boolean) => void
  setSimulatedPlan: (plan: string | null) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  isPlatformAdmin: null,
  simulatedPlan:   null,

  setIsPlatformAdmin: (val) => set({ isPlatformAdmin: val }),
  setSimulatedPlan:   (plan) => set({ simulatedPlan: plan }),
}))
