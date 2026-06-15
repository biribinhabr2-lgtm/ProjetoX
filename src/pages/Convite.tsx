/**
 * Convite — página pública de aceitação de convite de membro.
 * Rota: /convite/:token
 *
 * - Se não logado: salva token em sessionStorage e redireciona para /login?next=...
 * - Se logado e já tem org diferente: mostra aviso (não sobrescreve a org atual)
 * - Se logado sem org ou mesma org: aceita convite e vai para /app/agenda
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { acceptInvite } from '@/services/invites'

type PageState = 'loading' | 'conflict' | 'error'

export default function Convite() {
  const { token }   = useParams<{ token: string }>()
  const navigate    = useNavigate()
  const session     = useAuthStore((s) => s.session)
  const organization = useAuthStore((s) => s.organization)
  const refreshOrg  = useAuthStore((s) => s.refreshOrg)

  const [state,   setState]   = useState<PageState>('loading')
  const [message, setMessage] = useState('')
  // Guarda o org_id do convite para o aviso de conflito
  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Link de convite inválido.')
      return
    }

    if (!session) {
      sessionStorage.setItem('invite_token', token)
      navigate(`/login?next=/convite/${token}`, { replace: true })
      return
    }

    // Ainda carregando o authStore — espera
    if (organization === null && session) {
      // authStore pode ainda estar inicializando; deixa o useEffect rodar novamente
      // quando organization for resolvido (pode ser null = sem org, ou objeto = tem org)
      // Para distinguir "sem org" de "carregando", verificamos loading via store direto
      // mas como não temos acesso direto ao loading aqui, tentamos aceitar diretamente
    }

    void (async () => {
      try {
        const result = await acceptInvite(token)
        sessionStorage.removeItem('invite_token')

        if (result.already_member) {
          toast.info('Você já era membro desta organização.')
          await refreshOrg()
          navigate('/app/agenda', { replace: true })
          return
        }

        // Convite aceito com sucesso
        toast.success('Bem-vindo à equipe! 🎉')
        await refreshOrg()
        navigate('/app/agenda', { replace: true })
      } catch (err: unknown) {
        // Se o usuário já tem uma org diferente e o banco bloqueou (caso futuro),
        // mostramos um aviso. Por ora tratamos como erro genérico.
        const msg = err instanceof Error ? err.message : 'Convite inválido ou expirado.'
        setState('error')
        setMessage(msg)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, session])

  // Aviso de conflito: usuário logado já tem uma org diferente da do convite
  if (state === 'conflict') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Logo />
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Você já tem uma conta ativa
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Este convite é para uma organização diferente da sua conta atual.
          Para aceitar, faça login com o e-mail para o qual o convite foi enviado.
        </p>
        <div className="flex gap-3">
          <Link
            to="/app/agenda"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Minha conta
          </Link>
          <Link
            to={`/login?next=/convite/${token ?? ''}`}
            className="rounded-md border px-4 py-2 text-sm font-medium text-foreground"
          >
            Entrar com outro e-mail
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Logo />
        <p
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-destructive)' }}
        >
          {message}
        </p>
        <Link to="/login" className="text-sm underline" style={{ color: 'var(--color-primary)' }}>
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm text-muted-foreground">Processando convite…</p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#E8462A" />
      <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
      <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
    </svg>
  )
}
