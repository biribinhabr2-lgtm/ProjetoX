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
import { signUp } from '@/services/auth'

const schema = z
  .object({
    fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

// ─── Painel decorativo – variante do login ──────────────────
function BrandPanel() {
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
      style={{ background: 'linear-gradient(145deg, #16131F 0%, #2A1A15 55%, #E8462A 100%)' }}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="dots2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots2)" />
      </svg>

      <div
        className="animate-spin-slow absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-15"
        style={{ border: '2px solid white' }}
      />
      <div
        className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-10"
        style={{ border: '2px solid white' }}
      />

      <div className="relative flex items-center gap-2.5">
        <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.2)" />
          <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
          <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
        </svg>
        <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          FestaHub
        </span>
      </div>

      <div className="relative">
        <h2
          className="text-3xl font-bold leading-tight text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          14 dias grátis, sem cartão de crédito
        </h2>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Comece agora e transforme a gestão do seu buffet. Cadastro em menos de 1 minuto.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {[
            { num: '500+', label: 'Buffets ativos' },
            { num: '10k+', label: 'Festas realizadas' },
            { num: '4.9★', label: 'Avaliação média' },
            { num: '100%', label: 'Seguro e na nuvem' },
          ].map(({ num, label }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {num}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        © {new Date().getFullYear()} FestaHub. Todos os direitos reservados.
      </p>
    </div>
  )
}

// ─── Página Cadastro ─────────────────────────────────────────
export default function Cadastro() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    try {
      await signUp(data.email, data.password, data.fullName)
      toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar'
      toast.error(traduzirErroAuth(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

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
              Criar sua conta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece grátis, sem precisar de cartão
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Maria Silva"
                className="h-11 rounded-lg"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
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
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="h-11 rounded-lg"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                className="h-11 rounded-lg"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Criando conta…' : 'Criar conta grátis'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ao criar conta, você concorda com os{' '}
            <span className="cursor-pointer text-primary hover:underline">Termos de Uso</span>
            {' '}e{' '}
            <span className="cursor-pointer text-primary hover:underline">Política de Privacidade</span>.
          </p>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function traduzirErroAuth(msg: string): string {
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado'
  if (msg.includes('Password should be at least')) return 'Senha deve ter pelo menos 6 caracteres'
  return msg
}
