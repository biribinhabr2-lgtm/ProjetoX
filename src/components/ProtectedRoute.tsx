import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  children: React.ReactNode
}

function hasDeclinedInvites(): boolean {
  try {
    const list = JSON.parse(localStorage.getItem('fh_declined_invites') ?? '[]') as unknown[]
    return Array.isArray(list) && list.length > 0
  } catch {
    return false
  }
}

export function ProtectedRoute({ children }: Props) {
  const { session, organization, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true"
          className="animate-pulse">
          <circle cx="14" cy="14" r="14" fill="#E8462A" />
          <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" />
          <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="14" cy="17.5" r="1" fill="white" />
        </svg>
        <div className="h-1 w-20 overflow-hidden rounded-full bg-border">
          <div
            className="h-full animate-[loading_1.4s_ease-in-out_infinite] rounded-full"
            style={{ background: 'var(--color-primary)', width: '40%' }}
          />
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!organization) {
    // Usuário que recusou um convite → página de "sem acesso" (não onboarding)
    if (hasDeclinedInvites()) return <Navigate to="/sem-acesso" replace />
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
