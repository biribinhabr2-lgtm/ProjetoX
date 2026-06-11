/**
 * CustomerForm — formulário de criação e edição de cliente.
 *
 * Regra 2: SectionLabel e FieldError definidos em nível de módulo.
 * Regra 7: telefone armazenado apenas como string (sem formatação no banco).
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { maskPhone, unmaskedPhone } from '@/lib/birthday'
import type { Customer } from '@/types/database'

// ── Helpers de sub-componentes ────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground first:mt-0">
      {children}
    </p>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

// ── Schema ────────────────────────────────────────────────────
const PHONE_DIGITS_RE = /^\d{10,11}$/

const schema = z.object({
  name:             z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  phone:            z.string()
                      .optional()
                      .refine(
                        (v) => !v || PHONE_DIGITS_RE.test(unmaskedPhone(v)),
                        'Telefone inválido — use (XX) XXXXX-XXXX',
                      ),
  email:            z.string().email('E-mail inválido').optional().or(z.literal('')),
  cpf:              z.string().optional(),
  child_name:       z.string().optional(),
  child_birthdate:  z.string().optional(),
  notes:            z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────
export interface CustomerFormValues {
  name: string
  phone: string | null
  email: string | null
  cpf: string | null
  child_name: string | null
  child_birthdate: string | null
  notes: string | null
}

interface CustomerFormProps {
  defaultValues?: Customer
  saving: boolean
  onSubmit: (values: CustomerFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

// ── Componente principal ──────────────────────────────────────
export function CustomerForm({
  defaultValues,
  saving,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
}: CustomerFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        name:            defaultValues?.name ?? '',
        phone:           defaultValues?.phone ?? '',
        email:           defaultValues?.email ?? '',
        cpf:             defaultValues?.cpf ?? '',
        child_name:      defaultValues?.child_name ?? '',
        child_birthdate: defaultValues?.child_birthdate ?? '',
        notes:           defaultValues?.notes ?? '',
      },
    })

  // Reset quando o cliente muda (modo edição trocando de registro)
  useEffect(() => {
    reset({
      name:            defaultValues?.name ?? '',
      phone:           defaultValues?.phone ?? '',
      email:           defaultValues?.email ?? '',
      cpf:             defaultValues?.cpf ?? '',
      child_name:      defaultValues?.child_name ?? '',
      child_birthdate: defaultValues?.child_birthdate ?? '',
      notes:           defaultValues?.notes ?? '',
    })
  }, [defaultValues?.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const phoneValue = watch('phone') ?? ''

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('phone', maskPhone(e.target.value), { shouldValidate: true })
  }

  async function handleFormSubmit(data: FormData) {
    await onSubmit({
      name:            data.name.trim(),
      phone:           data.phone ? unmaskedPhone(data.phone) : null,
      email:           data.email?.trim() || null,
      cpf:             data.cpf?.trim() || null,
      child_name:      data.child_name?.trim() || null,
      child_birthdate: data.child_birthdate || null,
      notes:           data.notes?.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-0">
      {/* Responsável */}
      <SectionLabel>Responsável</SectionLabel>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cf-name">Nome *</Label>
          <Input id="cf-name" placeholder="Maria da Silva" className="h-11" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cf-phone">Telefone / WhatsApp</Label>
          <Input
            id="cf-phone"
            type="tel"
            inputMode="numeric"
            placeholder="(11) 99999-9999"
            className="h-11"
            value={phoneValue}
            onChange={handlePhoneChange}
          />
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cf-email">E-mail</Label>
          <Input
            id="cf-email"
            type="email"
            placeholder="maria@email.com"
            className="h-11"
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cf-cpf">CPF</Label>
          <Input id="cf-cpf" placeholder="000.000.000-00" className="h-11" {...register('cpf')} />
        </div>
      </div>

      {/* Criança */}
      <SectionLabel>Criança</SectionLabel>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cf-child-name">Nome da criança</Label>
          <Input id="cf-child-name" placeholder="João" className="h-11" {...register('child_name')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cf-child-bd">Data de nascimento</Label>
          <Input id="cf-child-bd" type="date" className="h-11" {...register('child_birthdate')} />
          <p className="text-xs text-muted-foreground">
            Usada para o radar de aniversários próximos
          </p>
        </div>
      </div>

      {/* Observações */}
      <SectionLabel>Observações</SectionLabel>
      <Textarea
        placeholder="Preferências, alergias, indicação…"
        className="min-h-[72px] resize-none"
        {...register('notes')}
      />

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
