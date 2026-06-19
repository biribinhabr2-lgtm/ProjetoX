/**
 * SemAcesso — exibida para usuários autenticados sem vínculo a nenhum buffet.
 * Aparece quando o usuário recusou um convite (ou por algum motivo ficou sem org).
 */

import { Link } from 'react-router-dom'
import { signOut } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

export default function SemAcesso() {
  const clear = useAuthStore((s) => s.clear)

  async function handleSignOut() {
    try { await signOut() } catch { /* silencioso */ }
    clear()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <svg width="56" height="56" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="14" fill="#E8462A" />
        <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
        <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
      </svg>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Sem acesso a nenhum buffet
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Você não está vinculado a nenhum buffet no momento. Você pode criar o seu próprio ou pedir
          um novo link de convite ao responsável pelo buffet.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/onboarding"
          className="flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Criar meu buffet
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-11 items-center justify-center rounded-lg border text-sm font-medium text-foreground hover:bg-muted"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
