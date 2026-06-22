import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/services/profiles'
import { getMyOrgAndMembership } from '@/services/orgs'
import { isNetworkError } from '@/lib/errorUtils'
import type { Membership, Organization, Profile } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  organization: Organization | null
  membership: Membership | null
  loading: boolean
  /** true quando uma chamada de rede falhou sem resposta do servidor (sem conexão) */
  networkError: boolean

  initialize: () => () => void
  refreshOrg: () => Promise<void>
  retryLoad: () => Promise<void>
  clear: () => void
}

async function loadProfileAndOrg(userId: string) {
  const [profile, orgResult] = await Promise.all([
    getProfile(userId),
    getMyOrgAndMembership(userId),
  ])
  return { profile, orgResult }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  organization: null,
  membership: null,
  loading: true,
  networkError: false,

  initialize() {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const session = data.session
        if (!session) {
          set({ session: null, user: null, loading: false })
          return
        }

        set({ session, user: session.user })

        loadProfileAndOrg(session.user.id)
          .then(({ profile, orgResult }) => {
            set({
              profile,
              organization: orgResult?.organization ?? null,
              membership: orgResult?.membership ?? null,
              loading: false,
              networkError: false,
            })
          })
          .catch((err: unknown) => {
            if (isNetworkError(err)) {
              // Mantém sessão intacta; só sinaliza falta de conexão
              set({ loading: false, networkError: true })
            } else {
              set({ loading: false })
            }
          })
      })
      .catch((err: unknown) => {
        // getSession em si falhou (raro, mas pode ser rede)
        if (isNetworkError(err)) {
          set({ loading: false, networkError: true })
        } else {
          set({ loading: false })
        }
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Resposta real do servidor indicando sem sessão → deslogar
        get().clear()
        return
      }

      set({ session, user: session.user, loading: true, networkError: false })

      loadProfileAndOrg(session.user.id)
        .then(({ profile, orgResult }) => {
          set({
            profile,
            organization: orgResult?.organization ?? null,
            membership: orgResult?.membership ?? null,
            loading: false,
            networkError: false,
          })
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            set({ loading: false, networkError: true })
          } else {
            set({ loading: false })
          }
        })
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  },

  async refreshOrg() {
    const { user } = get()
    if (!user) return

    try {
      const orgResult = await getMyOrgAndMembership(user.id)
      set({
        organization: orgResult?.organization ?? null,
        membership: orgResult?.membership ?? null,
        networkError: false,
      })
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        set({ networkError: true })
      }
    }
  },

  async retryLoad() {
    const { user, session } = get()
    if (!session || !user) return

    set({ loading: true, networkError: false })

    try {
      const { profile, orgResult } = await loadProfileAndOrg(user.id)
      set({
        profile,
        organization: orgResult?.organization ?? null,
        membership: orgResult?.membership ?? null,
        loading: false,
        networkError: false,
      })
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        set({ loading: false, networkError: true })
      } else {
        set({ loading: false })
      }
    }
  },

  clear() {
    set({
      session: null,
      user: null,
      profile: null,
      organization: null,
      membership: null,
      loading: false,
      networkError: false,
    })
  },
}))
