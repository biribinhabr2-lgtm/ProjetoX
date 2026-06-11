import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/services/profiles'
import { getMyOrgAndMembership } from '@/services/orgs'
import type { Membership, Organization, Profile } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  organization: Organization | null
  membership: Membership | null
  loading: boolean

  initialize: () => () => void
  refreshOrg: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  organization: null,
  membership: null,
  loading: true,

  initialize() {
    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session) {
        set({ session: null, user: null, loading: false })
        return
      }

      set({ session, user: session.user })

      // Carrega profile e org em paralelo
      Promise.all([
        getProfile(session.user.id),
        getMyOrgAndMembership(session.user.id),
      ])
        .then(([profile, orgResult]) => {
          set({
            profile,
            organization: orgResult?.organization ?? null,
            membership: orgResult?.membership ?? null,
            loading: false,
          })
        })
        .catch(() => {
          set({ loading: false })
        })
    })

    // Escuta mudanças de sessão
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        get().clear()
        return
      }

      set({ session, user: session.user })

      Promise.all([
        getProfile(session.user.id),
        getMyOrgAndMembership(session.user.id),
      ])
        .then(([profile, orgResult]) => {
          set({
            profile,
            organization: orgResult?.organization ?? null,
            membership: orgResult?.membership ?? null,
            loading: false,
          })
        })
        .catch(() => {
          set({ loading: false })
        })
    })

    // Retorna unsubscribe para limpar listener
    return () => {
      listener.subscription.unsubscribe()
    }
  },

  async refreshOrg() {
    const { user } = get()
    if (!user) return

    const orgResult = await getMyOrgAndMembership(user.id)
    set({
      organization: orgResult?.organization ?? null,
      membership: orgResult?.membership ?? null,
    })
  },

  clear() {
    set({
      session: null,
      user: null,
      profile: null,
      organization: null,
      membership: null,
      loading: false,
    })
  },
}))
