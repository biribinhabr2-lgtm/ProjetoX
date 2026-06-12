import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'

/**
 * Verifica via RPC (nunca por e-mail no frontend) se o usuário atual
 * é platform admin. O resultado é cacheado no adminStore.
 *
 * A PROTEÇÃO REAL é o RLS + a função SECURITY DEFINER no banco.
 * Este hook é apenas conveniência de UX.
 */
export function useIsPlatformAdmin(): boolean {
  const user               = useAuthStore((s) => s.user)
  const isPlatformAdmin    = useAdminStore((s) => s.isPlatformAdmin)
  const setIsPlatformAdmin = useAdminStore((s) => s.setIsPlatformAdmin)

  useEffect(() => {
    // Só verifica uma vez por sessão (isPlatformAdmin !== null → já verificado)
    if (!user || isPlatformAdmin !== null) return

    supabase.rpc('is_platform_admin').then(({ data, error }) => {
      if (!error) setIsPlatformAdmin(!!data)
    })
  }, [user, isPlatformAdmin, setIsPlatformAdmin])

  return isPlatformAdmin === true
}
