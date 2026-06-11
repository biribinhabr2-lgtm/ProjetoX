import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOrgWithOwner } from '@/services/orgs'
import { useAuthStore } from '@/stores/authStore'
import { sendEmail } from '@/services/email'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  city: z.string().min(2, 'Informe a cidade'),
  phone: z.string().min(10, 'Telefone inválido').max(20, 'Telefone inválido'),
})

type FormData = z.infer<typeof schema>

const steps = [
  { label: 'Conta criada', done: true },
  { label: 'Configure seu buffet', done: false, active: true },
  { label: 'Pronto para usar', done: false },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const refreshOrg = useAuthStore((s) => s.refreshOrg)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    if (!user) return
    setSubmitting(true)
    try {
      await createOrgWithOwner(user.id, data)
      await refreshOrg()
      // Fire-and-forget: não bloqueia onboarding se e-mail falhar
      void sendEmail({
        to: user.email ?? '',
        template: 'boas-vindas',
        data: { name: user.user_metadata?.full_name ?? user.email ?? '', org_name: data.name },
      })
      toast.success('Buffet configurado! Bem-vindo ao FestaHub 🎉')
      navigate('/app/agenda', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar buffet'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Logo */}
      <div className="mb-10 flex items-center gap-2.5 animate-fade-in">
        <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="14" fill="#E8462A" />
          <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" />
          <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="14" cy="17.5" r="1" fill="white" />
        </svg>
        <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          FestaHub
        </span>
      </div>

      {/* Progress steps */}
      <div className="mb-10 flex items-center gap-0 animate-fade-in delay-100">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{
                  background: step.done
                    ? 'var(--color-success)'
                    : step.active
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                  color: step.done || step.active ? 'white' : 'var(--color-muted-foreground)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {step.done ? '✓' : i + 1}
              </div>
              <span
                className="hidden text-[10px] font-medium whitespace-nowrap sm:block"
                style={{
                  color: step.active
                    ? 'var(--color-primary)'
                    : step.done
                      ? 'var(--color-success)'
                      : 'var(--color-muted-foreground)',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="mx-2 mb-3 h-px w-16 sm:w-24"
                style={{
                  background: i === 0 ? 'var(--color-success)' : 'var(--color-border)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card do formulário */}
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-8 animate-scale-in delay-200"
        style={{ boxShadow: 'var(--shadow-popover)' }}
      >
        <div className="mb-6 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--color-primary-light)' }}
          >
            <Sparkles className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Configure seu buffet
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Preencha os dados básicos da sua empresa para começar
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Nome do buffet <span style={{ color: 'var(--color-primary)' }}>*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Buffet Estrelinhas"
              className="h-11 rounded-lg"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-sm font-medium">
              Cidade <span style={{ color: 'var(--color-primary)' }}>*</span>
            </Label>
            <Input
              id="city"
              type="text"
              placeholder="São Paulo"
              className="h-11 rounded-lg"
              {...register('city')}
            />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium">
              Telefone / WhatsApp <span style={{ color: 'var(--color-primary)' }}>*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-0000"
              className="h-11 rounded-lg"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-2 h-11 w-full rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Configurando…' : 'Começar a usar o FestaHub →'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-xs text-muted-foreground animate-fade-in delay-300">
        Você poderá alterar esses dados nas configurações a qualquer momento.
      </p>
    </div>
  )
}
