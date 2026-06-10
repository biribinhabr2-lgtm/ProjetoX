import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type FormData = z.infer<typeof schema>

// ─── Painel decorativo esquerdo ──────────────────────────────
function BrandPanel() {
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
      style={{ background: 'linear-gradient(145deg, #E8462A 0%, #C4341A 55%, #16131F 100%)' }}
    >
      {/* Pattern de pontos */}
      <svg
        className="absolute inset-0 h-full w-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Círculos decorativos */}
      <div
        className="animate-spin-slow absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-15"
        style={{ border: '2px solid white' }}
      />
      <div
        className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-10"
        style={{ border: '2px solid white' }}
      />

      {/* Logo */}
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.2)" />
            <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
            <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
          </svg>
          <span
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            FestaHub
          </span>
        </div>
      </div>

      {/* Copy central */}
      <div className="relative">
        <h2
          className="text-3xl font-bold leading-tight text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Gestão completa para o seu buffet infantil
        </h2>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Agenda, clientes, orçamentos e financeiro — tudo em um só lugar. Focado no que importa: fazer festas inesquecíveis.
        </p>

        {/* Features */}
        <ul className="mt-8 space-y-3">
          {[
            'Agenda de festas com visão mensal',
            'Orçamentos com link de aprovação',
            'Controle financeiro completo',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Rodapé */}
      <p className="relative text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        © {new Date().getFullYear()} FestaHub. Todos os direitos reservados.
      </p>
    </div>
  )
}

// ─── Página Login ────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const refreshOrg = useAuthStore((s) => s.refreshOrg)
  const organization = useAuthStore((s) => s.organization)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    try {
      await signIn(data.email, data.password)
      await refreshOrg()
      if (organization) {
        navigate('/app/agenda', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar'
      toast.error(traduzirErroAuth(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      {/* Painel do formulário */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="14" fill="#E8462A" />
            <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" />
            <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14" cy="17.5" r="1" fill="white" />
          </svg>
          <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            FestaHub
          </span>
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Bem-vindo de volta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre na sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="h-11 rounded-lg"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 rounded-lg"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link
              to="/cadastro"
              className="font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function traduzirErroAuth(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar'
  if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde alguns minutos'
  return msg
}
