/**
 * Convite — página pública de aceitação de convite de membro.
 * Rota: /convite/:token
 *
 * Fluxo:
 * 1. Não logado → mostra opções de login/cadastro (sem redirecionar automaticamente)
 * 2. Logado → busca preview (nome do buffet) → pergunta "Deseja fazer parte?"
 *    - Sim → accept_invite → refreshOrg → /app/agenda
 *    - Não → decline_invite → mostra tela de recusa (sem redirecionar para onboarding)
 * 3. Convite já recusado (localStorage) → mostra tela de recusa direto
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { getInvitePreview, acceptInvite, declineInvite } from '@/services/invites'
import type { InvitePreview } from '@/services/invites'

type PageState =
  | 'loading'
  | 'login_required'
  | 'confirm'
  | 'accepting'
  | 'accepted'
  | 'declined'
  | 'already_member'
  | 'error'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
}

const DECLINED_KEY = 'fh_declined_invites'

function getDeclinedTokens(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DECLINED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function markDeclined(token: string) {
  const list = getDeclinedTokens()
  if (!list.includes(token)) {
    localStorage.setItem(DECLINED_KEY, JSON.stringify([...list, token]))
  }
}

export default function Convite() {
  const { token }     = useParams<{ token: string }>()
  const navigate      = useNavigate()
  const session       = useAuthStore((s) => s.session)
  const authLoading   = useAuthStore((s) => s.loading)
  const refreshOrg    = useAuthStore((s) => s.refreshOrg)

  const [state,   setState]   = useState<PageState>('loading')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [errMsg,  setErrMsg]  = useState('')

  useEffect(() => {
    if (!token) {
      setErrMsg('Link de convite inválido.')
      setState('error')
      return
    }

    // Convite já recusado neste browser → não mostrar novamente
    if (getDeclinedTokens().includes(token)) {
      setState('declined')
      return
    }

    if (authLoading) return   // aguarda authStore carregar

    if (!session) {
      // Salva token para uso após login/cadastro
      sessionStorage.setItem('invite_token', token)
      setState('login_required')
      return
    }

    // Logado — busca preview para mostrar nome do buffet antes de confirmar
    void (async () => {
      try {
        const data = await getInvitePreview(token)
        setPreview(data)
        setState('confirm')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Convite inválido ou expirado.'
        setErrMsg(msg)
        setState('error')
      }
    })()
  }, [token, session, authLoading])

  async function handleAccept() {
    if (!token) return
    setState('accepting')
    try {
      const result = await acceptInvite(token)
      sessionStorage.removeItem('invite_token')
      await refreshOrg()
      if (result.already_member) {
        setState('already_member')
        setTimeout(() => navigate('/app/agenda', { replace: true }), 1500)
        return
      }
      setState('accepted')
      toast.success('Bem-vindo à equipe! 🎉')
      setTimeout(() => navigate('/app/agenda', { replace: true }), 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aceitar convite.'
      setErrMsg(msg)
      setState('error')
    }
  }

  async function handleDecline() {
    if (!token) return
    try {
      await declineInvite(token)
    } catch {
      // silencioso — marca localmente mesmo se RPC falhar
    }
    markDeclined(token)
    sessionStorage.removeItem('invite_token')
    setState('declined')
  }

  if (state === 'loading' || (authLoading && state === 'loading')) {
    return <FullPageSpinner />
  }

  if (state === 'login_required') {
    return (
      <FullPage>
        <Logo />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Você recebeu um convite!
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground text-center">
          Para aceitar o convite, entre na sua conta ou crie uma nova (gratuita, leva menos de 1 minuto).
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            to={`/login?next=/convite/${token ?? ''}`}
            className="flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            Entrar na minha conta
          </Link>
          <Link
            to={`/cadastro?invite=${token ?? ''}`}
            className="flex h-11 items-center justify-center rounded-lg border text-sm font-semibold text-foreground hover:bg-muted"
          >
            Criar conta gratuita
          </Link>
        </div>
      </FullPage>
    )
  }

  if (state === 'confirm' && preview) {
    return (
      <FullPage>
        <Logo />
        <div className="rounded-2xl border bg-card p-6 w-full max-w-sm space-y-4 shadow-sm">
          <div className="space-y-1 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Convite de acesso</p>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {preview.org_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Você foi convidado como{' '}
              <span className="font-semibold text-foreground">
                {ROLE_LABELS[preview.role] ?? preview.role}
              </span>
              .
            </p>
          </div>
          <p className="text-sm text-center text-foreground">
            Deseja fazer parte deste buffet?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={handleDecline}
            >
              Não, recusar
            </Button>
            <Button
              className="flex-1 h-11 font-semibold"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
              onClick={handleAccept}
            >
              Sim, entrar
            </Button>
          </div>
        </div>
      </FullPage>
    )
  }

  if (state === 'accepting') {
    return <FullPageSpinner label="Aceitando convite…" />
  }

  if (state === 'accepted' || state === 'already_member') {
    return (
      <FullPage>
        <CheckCircle2 className="h-14 w-14" style={{ color: 'var(--color-success)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          {state === 'accepted' ? 'Bem-vindo à equipe!' : 'Você já é membro!'}
        </h2>
        <p className="text-sm text-muted-foreground">Redirecionando…</p>
      </FullPage>
    )
  }

  if (state === 'declined') {
    return (
      <FullPage>
        <XCircle className="h-14 w-14 text-muted-foreground" />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Convite recusado
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground text-center">
          Você recusou este convite. Caso mude de ideia, peça ao responsável pelo buffet um novo link.
        </p>
        <Link
          to="/"
          className="text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          Ir para a página inicial
        </Link>
      </FullPage>
    )
  }

  if (state === 'error') {
    return (
      <FullPage>
        <Logo />
        <p
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-destructive)' }}
        >
          {errMsg || 'Convite inválido ou expirado.'}
        </p>
        <Link to="/login" className="text-sm underline" style={{ color: 'var(--color-primary)' }}>
          Ir para o login
        </Link>
      </FullPage>
    )
  }

  return <FullPageSpinner />
}

// ─── Helpers de layout ────────────────────────────────────────

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-6 text-center">
      {children}
    </div>
  )
}

function FullPageSpinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'var(--color-primary)' }}
        />
        <p className="text-sm text-muted-foreground">{label}</p>
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
