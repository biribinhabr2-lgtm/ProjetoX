import { useAuthStore } from '@/stores/authStore'
import type { MembershipRole } from '@/types/database'

/** Retorna o papel (role) do usuário logado na organização atual. */
export function useRole(): MembershipRole | null {
  return useAuthStore((s) => s.membership?.role ?? null)
}

/** true quando o usuário pode gerenciar a org (owner ou admin). */
export function useCanManage(): boolean {
  const role = useRole()
  return role === 'owner' || role === 'admin'
}
