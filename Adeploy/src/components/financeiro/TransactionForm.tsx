/**
 * TransactionForm — criar/editar lançamento financeiro.
 *
 * Regra 2: SectionLabel e FieldError em nível de módulo.
 * Regra 7: valores em centavos. Conversão reais→centavos com Math.round.
 */

import { useEffect } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  TRANSACTION_CATEGORIES, CATEGORY_LABELS,
} from '@/services/transactions'
import type { Transaction } from '@/types/database'

// ── Sub-componentes ───────────────────────────────────────────
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
const schema = z.object({
  type:           z.enum(['receita', 'despesa']),
  description:    z.string().min(2, 'Mín. 2 caracteres').max(200),
  amount_reais:   z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  due_date:       z.string().min(1, 'Data obrigatória'),
  paid:           z.boolean(),
  paid_at:        z.string().optional(),
  category:       z.string().min(1, 'Selecione uma categoria'),
  payment_method: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────
export interface TransactionFormValues {
  type:            'receita' | 'despesa'
  description:     string
  amount_cents:    number   // inteiro, nunca float
  due_date:        string
  paid_at:         string | null
  category:        string
  payment_method:  string | null
}

interface TransactionFormProps {
  defaultValues?: Transaction
  saving:         boolean
  onSubmit:       (v: TransactionFormValues) => Promise<void>
  onCancel:       () => void
  submitLabel?:   string
}

// ── TransactionForm ───────────────────────────────────────────
export function TransactionForm({
  defaultValues,
  saving,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
}: TransactionFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  // Cast necessário: z.coerce.number() produz `unknown` no resolver Zod, causando mismatch
  // com o tipo inferido de FormData. Mesmo padrão usado em EventDialog e QuoteForm.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolver = zodResolver(schema) as Resolver<FormData, any>

  const { control, register, handleSubmit, watch, reset, setValue, formState: { errors } } =
    useForm<FormData>({
      resolver,
      defaultValues: buildDefaults(defaultValues, today),
    })

  useEffect(() => {
    reset(buildDefaults(defaultValues, today))
  }, [defaultValues?.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPaid = watch('paid')

  async function handleFormSubmit(data: FormData) {
    // Math.round garante inteiro — evita 14.99 * 100 = 1498.9999...
    const amount_cents = Math.round(data.amount_reais * 100)

    await onSubmit({
      type:           data.type,
      description:    data.description.trim(),
      amount_cents,
      due_date:       data.due_date,
      paid_at:        data.paid ? (data.paid_at || today) : null,
      category:       data.category,
      payment_method: data.payment_method?.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-0">
      {/* Tipo */}
      <SectionLabel>Tipo</SectionLabel>
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-2">
            {(['receita', 'despesa'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => field.onChange(t)}
                className="rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all"
                style={{
                  borderColor: field.value === t
                    ? t === 'receita' ? 'var(--color-success)' : 'var(--color-destructive)'
                    : undefined,
                  backgroundColor: field.value === t
                    ? t === 'receita' ? '#F0FDF4' : '#FEF2F2'
                    : undefined,
                  color: field.value === t
                    ? t === 'receita' ? 'var(--color-success)' : 'var(--color-destructive)'
                    : undefined,
                }}
              >
                {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>
        )}
      />

      {/* Descrição + valor */}
      <SectionLabel>Dados</SectionLabel>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="tf-desc">Descrição *</Label>
          <Input id="tf-desc" placeholder="Ex: Pagamento festa da Sofia" className="h-11" {...register('description')} />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="tf-amount">Valor (R$) *</Label>
            <Input
              id="tf-amount"
              type="number"
              min={0.01}
              step="0.01"
              placeholder="0,00"
              className="h-11"
              {...register('amount_reais')}
            />
            <FieldError message={errors.amount_reais?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tf-due">Vencimento *</Label>
            <Input id="tf-due" type="date" className="h-11" {...register('due_date')} />
            <FieldError message={errors.due_date?.message} />
          </div>
        </div>

        {/* Categoria */}
        <div className="space-y-1">
          <Label>Categoria *</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecionar…" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.category?.message} />
        </div>

        {/* Forma de pagamento */}
        <div className="space-y-1">
          <Label htmlFor="tf-method">Forma de pagamento</Label>
          <Input
            id="tf-method"
            placeholder="Pix, Cartão, Dinheiro…"
            className="h-11"
            {...register('payment_method')}
          />
        </div>
      </div>

      {/* Pago */}
      <SectionLabel>Status</SectionLabel>
      <div className="space-y-3">
        <Controller
          name="paid"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="tf-paid"
                checked={field.value}
                onCheckedChange={(v) => {
                  field.onChange(v)
                  if (v && !watch('paid_at')) setValue('paid_at', today)
                }}
              />
              <Label htmlFor="tf-paid" className="cursor-pointer">
                {isPaid ? 'Lançamento pago/recebido' : 'Pendente'}
              </Label>
            </div>
          )}
        />

        {isPaid && (
          <div className="space-y-1">
            <Label htmlFor="tf-paid-at">Data do pagamento</Label>
            <Input id="tf-paid-at" type="date" className="h-11" {...register('paid_at')} />
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
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

// ── Helper ────────────────────────────────────────────────────
function buildDefaults(tx: Transaction | undefined, today: string): FormData {
  if (!tx) {
    return {
      type:           'receita',
      description:    '',
      amount_reais:   0,
      due_date:       today,
      paid:           false,
      paid_at:        '',
      category:       '',
      payment_method: '',
    }
  }
  return {
    type:           tx.type,
    description:    tx.description ?? '',
    // Divisão inteira sem float: Math.round garante exatidão na exibição
    amount_reais:   tx.amount_cents / 100,
    due_date:       tx.due_date ?? today,
    paid:           !!tx.paid_at,
    paid_at:        tx.paid_at ?? '',
    category:       tx.category ?? '',
    payment_method: tx.payment_method ?? '',
  }
}
