import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createOrgWithOwner } from '@/services/orgs'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  city: z.string().min(2, 'Informe a cidade'),
  phone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(20, 'Telefone inválido'),
})

type FormData = z.infer<typeof schema>

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
      toast.success('Buffet criado com sucesso! Bem-vindo ao FestaHub 🎉')
      navigate('/app/agenda', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar buffet'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configure seu buffet</CardTitle>
          <CardDescription>
            Preencha os dados da sua empresa para começar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="name">Nome do buffet *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Buffet Estrelinhas"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                type="text"
                placeholder="São Paulo"
                {...register('city')}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-0000"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Começar a usar o FestaHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
