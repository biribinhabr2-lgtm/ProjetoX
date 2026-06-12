/**
 * QuoteForm — formulário de criação e edição de orçamento.
 *
 * Regra 2: sub-componentes (SectionLabel, FieldError, ItemRow) em nível de módulo.
 * Regra 3: useFieldArray e outros hooks chamados sempre, nunca condicionalmente.
 * Regra 7: valores em centavos no banco; exibição em reais na UI.
 */

import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomerCombobox } from '@/components/agenda/CustomerCombobox'
import { NewCustomerDialog } from '@/components/agenda/NewCustomerDialog'
import { CatalogPanel } from '@/components/orcamentos/CatalogPanel'
import { cn } from '@/lib/utils'
import type { Customer, QuoteWithCustomer, CatalogItem } from '@/types/database'

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

// ── SectionLabel ──────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground first:mt-0">
      {children}
    </p>
  )
}

// ── FieldError ────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

// ── Schema ────────────────────────────────────────────────────
const itemSchema = z.object({
  description:      z.string().min(1, 'Descrição obrigatória'),
  quantity:         z.coerce.number().int().min(1, 'Mín. 1'),
  unit_price_reais: z.coerce.number().min(0, 'Mín. R$ 0'),
})

const schema = z.object({
  customer_id: z.string().min(1, 'Selecione um cliente'),
  valid_until: z.string().optional(),
  notes:       z.string().optional(),
  items:       z.array(itemSchema).min(1, 'Adicione pelo menos 1 item'),
})

type FormData = z.infer<typeof schema>

// ── ItemRow ───────────────────────────────────────────────────
interface ItemRowProps {
  index:      number
  quantity:   number
  unitPrice:  number
  onRemove:   () => void
  canRemove:  boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- register de useFieldArray exige any para campos indexados
  register:   (name: string) => any
  errDesc?:   string
  errQty?:    string
  errPrice?:  string
}

function ItemRow({
  index, quantity, unitPrice, onRemove, canRemove, register,
  errDesc, errQty, errPrice,
}: ItemRowProps) {
  const subtotal = Math.round((Number(quantity) || 0) * (Number(unitPrice) || 0) * 100)

  return (
    <div className="group relative grid grid-cols-12 gap-2 rounded-lg border bg-card p-3">
      {/* Descrição */}
      <div className="col-span-12 space-y-1 sm:col-span-5">
        <Label className="text-xs text-muted-foreground">Descrição</Label>
        <Input
          placeholder="Serviço ou item…"
          className="h-9 text-sm"
          {...register(`items.${index}.description`)}
        />
        <FieldError message={errDesc} />
      </div>

      {/* Quantidade */}
      <div className="col-span-4 space-y-1 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Qtd.</Label>
        <Input
          type="number"
          min={1}
          placeholder="1"
          className="h-9 text-sm"
          {...register(`items.${index}.quantity`)}
        />
        <FieldError message={errQty} />
      </div>

      {/* Valor unitário */}
      <div className="col-span-5 space-y-1 sm:col-span-3">
        <Label className="text-xs text-muted-foreground">Valor unit. (R$)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0,00"
          className="h-9 text-sm"
          {...register(`items.${index}.unit_price_reais`)}
        />
        <FieldError message={errPrice} />
      </div>

      {/* Subtotal */}
      <div className="col-span-3 flex flex-col justify-between sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Subtotal</Label>
        <p
          className="flex h-9 items-center justify-end text-sm font-semibold"
          style={{
            color:      subtotal > 0 ? 'var(--color-success)' : undefined,
            fontFamily: 'var(--font-display)',
          }}
        >
          {fmtBRL(subtotal)}
        </p>
      </div>

      {/* Remover */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Remover item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────
export interface QuoteFormPayload {
  customer_id: string
  items: Array<{
    description:      string
    quantity:         number
    unit_price_cents: number
    total_cents:      number
  }>
  total_cents: number
  valid_until: string | null
  notes:       string | null
}

interface QuoteFormProps {
  defaultValues?: QuoteWithCustomer
  customers:      Customer[]
  orgId:          string
  saving:         boolean
  catalogItems?:  CatalogItem[]
  onSubmit:       (payload: QuoteFormPayload) => Promise<void>
  onCancel:       () => void
  onAddCustomer:  (payload: { org_id: string; name: string; phone?: string; child_name?: string }) => Promise<Customer>
  submitLabel?:   string
}

// ── QuoteForm ─────────────────────────────────────────────────
export function QuoteForm({
  defaultValues,
  customers,
  orgId,
  saving,
  catalogItems = [],
  onSubmit,
  onCancel,
  onAddCustomer,
  submitLabel = 'Criar orçamento',
}: QuoteFormProps) {
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [catalogOpen, setCatalogOpen]         = useState(false)

  // Cast necessário: z.coerce.number() produz tipo unknown no resolver — mesmo padrão do EventDialog
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolver = zodResolver(schema) as Resolver<FormData, any>

  const {
    control, register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<FormData>({ resolver, defaultValues: buildDefaults(defaultValues) })

  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' })

  // Reset ao trocar de orçamento editado
  useEffect(() => {
    reset(buildDefaults(defaultValues))
  }, [defaultValues?.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsWatch = watch('items') ?? []

  // Total calculado em centavos
  const totalCents = itemsWatch.reduce((acc, item) => {
    const qty   = Number(item.quantity)        || 0
    const price = Number(item.unit_price_reais) || 0
    return acc + Math.round(qty * price * 100)
  }, 0)

  // ── Inserção a partir do catálogo ─────────────────────────
  // Clique repetido no [+] incrementa a quantidade da linha existente.
  function handleCatalogInsert(catalogItem: CatalogItem) {
    const existingIdx = itemsWatch.findIndex(
      (row) => row.description === catalogItem.name,
    )

    if (existingIdx >= 0) {
      // Incrementa quantidade da linha já existente
      const current = itemsWatch[existingIdx]
      update(existingIdx, {
        description:      current.description,
        quantity:         (Number(current.quantity) || 1) + 1,
        unit_price_reais: Number(current.unit_price_reais),
      })
    } else {
      // Insere nova linha com dados do catálogo (editável manualmente após inserida)
      append({
        description:      catalogItem.name,
        quantity:         1,
        unit_price_reais: catalogItem.price_cents / 100,
      })
    }
  }

  async function handleFormSubmit(data: FormData) {
    const items = data.items.map((item) => {
      const qty   = Number(item.quantity)
      const price = Math.round(Number(item.unit_price_reais) * 100)
      return {
        description:      item.description.trim(),
        quantity:         qty,
        unit_price_cents: price,
        total_cents:      qty * price,
      }
    })

    await onSubmit({
      customer_id: data.customer_id,
      items,
      total_cents: items.reduce((s, i) => s + i.total_cents, 0),
      valid_until: data.valid_until || null,
      notes:       data.notes?.trim() || null,
    })
  }

  function handleNewCustomerCreated(customer: Customer) {
    setValue('customer_id', customer.id)
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-0">
        {/* Cliente */}
        <SectionLabel>Cliente</SectionLabel>
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <CustomerCombobox
              customers={customers}
              value={field.value}
              onChange={field.onChange}
              onCreateNew={() => setNewCustomerOpen(true)}
              error={!!errors.customer_id}
            />
          )}
        />
        <FieldError message={errors.customer_id?.message} />

        {/* Validade e observações */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="qf-valid">Validade</Label>
            <Input id="qf-valid" type="date" className="h-11" {...register('valid_until')} />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <Label htmlFor="qf-notes">Observações</Label>
          <Textarea
            id="qf-notes"
            placeholder="Condições, prazo de pagamento…"
            className="min-h-[60px] resize-none"
            {...register('notes')}
          />
        </div>

        {/* Itens */}
        <SectionLabel>Itens</SectionLabel>
        {/* Erro geral de itens (mín. 1) */}
        {!Array.isArray(errors.items) && (errors.items as { message?: string } | undefined)?.message && (
          <FieldError message={(errors.items as { message?: string }).message} />
        )}

        <div className="space-y-2">
          {fields.map((field, idx) => (
            <ItemRow
              key={field.id}
              index={idx}
              quantity={Number(itemsWatch[idx]?.quantity ?? 1)}
              unitPrice={Number(itemsWatch[idx]?.unit_price_reais ?? 0)}
              onRemove={() => remove(idx)}
              canRemove={fields.length > 1}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- useFieldArray requer string genérica
              register={register as any}
              errDesc={ Array.isArray(errors.items) ? errors.items[idx]?.description?.message  : undefined }
              errQty={  Array.isArray(errors.items) ? errors.items[idx]?.quantity?.message      : undefined }
              errPrice={Array.isArray(errors.items) ? errors.items[idx]?.unit_price_reais?.message : undefined }
            />
          ))}
        </div>

        {/* Botões de adição */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => append({ description: '', quantity: 1, unit_price_reais: 0 })}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar item
          </Button>

          {catalogItems.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setCatalogOpen((v) => !v)}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Inserir do catálogo
              {catalogOpen
                ? <ChevronUp className="h-3 w-3" />
                : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>

        {/* Painel do catálogo — colapsável */}
        {catalogOpen && (
          <div
            className="mt-2 rounded-lg border p-3"
            style={{ background: 'var(--color-background)' }}
          >
            <CatalogPanel items={catalogItems} onInsert={handleCatalogInsert} />
          </div>
        )}

        {/* Total */}
        <div className={cn('mt-4 flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3')}>
          <span className="text-sm font-medium text-muted-foreground">Total do orçamento</span>
          <span
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}
          >
            {fmtBRL(totalCents)}
          </span>
        </div>

        {/* Footer */}
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

      <NewCustomerDialog
        open={newCustomerOpen}
        orgId={orgId}
        onClose={() => setNewCustomerOpen(false)}
        onCreated={handleNewCustomerCreated}
        onCreate={onAddCustomer}
      />
    </>
  )
}

// ── Helper ────────────────────────────────────────────────────
function buildDefaults(quote?: QuoteWithCustomer): FormData {
  if (!quote) {
    return {
      customer_id: '',
      valid_until: '',
      notes:       '',
      items:       [{ description: '', quantity: 1, unit_price_reais: 0 }],
    }
  }
  return {
    customer_id: quote.customer_id,
    valid_until: quote.valid_until ?? '',
    notes:       quote.notes ?? '',
    items:       quote.items.length > 0
      ? quote.items.map((i) => ({
          description:      i.description,
          quantity:         i.quantity,
          unit_price_reais: i.unit_price_cents / 100,
        }))
      : [{ description: '', quantity: 1, unit_price_reais: 0 }],
  }
}
