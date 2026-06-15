/**
 * Convite — página pública de aceitação de convite de membro.
 * Rota: /convite/:token
 *
 * - Se o usuário não está logado: salva o token em sessionStorage e
 *   redireciona para /login?next=/convite/:token
 * - Se está logado: chama accept_invite RPC e redireciona para /app/agenda
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { acceptInvite } from '@/services/invites'

export default function Convite() {
  const { token } = useParams<{ token: string }>()
  const navigate  = useNavigate()
  const session   = useAuthStore((s) => s.session)
  const refreshOrg = useAuthStore((s) => s.refreshOrg)

  const [status,  setStatus]  = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link de convite inválido.')
      return
    }

    if (!session) {
      // Guarda o token para após o login
      sessionStorage.setItem('invite_token', token)
      navigate(`/login?next=/convite/${token}`, { replace: true })
      return
    }

    acceptInvite(token)
      .then(async ({ already_member }) => {
        sessionStorage.removeItem('invite_token')
        await refreshOrg()
        if (already_member) {
          toast.info('Você já era membro desta organização.')
        } else {
          toast.success('Bem-vindo à equipe! 🎉')
        }
        navigate('/app/agenda', { replace: true })
      })
      .catch((err: unknown) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Convite inválido ou expirado.')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, session])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="14" fill="#E8462A" />
          <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
          <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
        </svg>
        <p
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-destructive)' }}
        >
          {message}
        </p>
        <Link
          to="/login"
          className="text-sm underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        <p className="text-sm text-muted-foreground">Processando convite…</p>
      </div>
    </div>
  )
}
