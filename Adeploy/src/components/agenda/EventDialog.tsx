/**
 * EventDialog — formulário de criação e edição de festas.
 *
 * REGRAS SEGUIDAS:
 * - Regra 2: todos os sub-componentes definidos em nível de módulo (fora do EventDialog).
 * - Regra 3: nenhum hook chamado condicionalmente.
 * - Regra 4: queries apenas via services/ (CustomerCombobox e NewCustomerDialog).
 * - Regra 7: dinheiro em centavos no banco; BRL na UI.
 */

import { useEffect, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CustomerCombobox } from '@/components/agenda/CustomerCombobox'
import { NewCustomerDialog } from '@/components/agenda/NewCustomerDialog'
import { ConflictWarningDialog } from '@/components/agenda/ConflictWarningDialog'
import { detectConflicts } from '@/services/events'
import type { Customer, EventWithDetails, Package } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────
const today = () => format(new Date(), 'yyyy-MM-dd')

const centsToBRL = (cents: number) =>
  (cents / 100).toFixed(2)

const brlToCents = (val: string | number) =>
  Math.round(Number(val) * 100)

// ── Schema Zod ────────────────────────────────────────────────
const baseSchema = z.object({
  customer_id:   z.string().min(1, 'Selecione um cliente'),
  package_id:    z.string().nullable().optional(),
  title:         z.string().optional(),
  date:          z.string().min(1, 'Data obrigatória'),
  start_time:    z.string().min(1, 'Horário de início obrigatório'),
  end_time:      z.string().min(1, 'Horário de término obrigatório'),
  guests_count:  z.coerce.number().int().min(0).nullable().optional(),
  total_reais:   z.coerce.number().min(0, 'Valor deve ser ≥ 0'),
  deposit_reais: z.coerce.number().min(0, 'Sinal deve ser ≥ 0'),
  deposit_paid:  z.boolean(),
  notes:         z.string().optional(),
})
  .refine(
    (d) => !d.start_time || !d.end_time || d.end_time > d.start_time,
    { message: 'Horário de término deve ser após o início', path: ['end_time'] },
  )
  .refine(
    (d) => !d.total_reais || !d.deposit_reais || d.deposit_reais <= d.total_reais,
    { message: 'Sinal não pode ser maior que o valor total', path: ['deposit_reais'] },
  )

const createSchema = baseSchema.superRefine((d, ctx) => {
  if (d.date < today()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A data da festa não pode ser no passado',
      path: ['date'],
    })
  }
})

type FormData = z.infer<typeof baseSchema>

// ── Linha separadora de seção ─────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

// ── Campo de erro ─────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

// ── Props principais ──────────────────────────────────────────
/** Dados de pré-preenchimento ao converter orçamento em festa */
export interface EventDialogPrefill {
  customer_id?:   string
  total_cents?:   number
  deposit_cents?: number
}

export interface EventDialogProps {
  open:       boolean
  mode:       'create' | 'edit'
  orgId:      string
  initialDate?: string            // pré-preenche a data ao criar
  event?:     EventWithDetails    // preenche o form ao editar
  prefill?:   EventDialogPrefill  // pré-preenche ao criar a partir de orçamento
  customers:  Customer[]
  packages:   Package[]
  onClose:    () => void
  onCreate:   (data: EventFormPayload) => Promise<void>
  onUpdate:   (id: string, data: EventFormPayload) => Promise<void>
  onAddCustomer: (payload: { org_id: string; name: string; phone?: string; child_name?: string }) => Promise<Customer>
}

export interface EventFormPayload {
  customer_id:    string
  package_id:     string | null
  title:          string | null
  date:           string
  start_time:     string
  end_time:       string
  guests_count:   number | null
  total_cents:    number
  deposit_cents:  number
  deposit_paid:   boolean
  notes:          string | null
}

// ── EventDialog ───────────────────────────────────────────────
export function EventDialog({
  open, mode, orgId, initialDate, event, prefill,
  customers, packages,
  onClose, onCreate, onUpdate, onAddCustomer,
}: EventDialogProps) {
  const isCreate = mode === 'create'

  // Estado de sub-diálogos
  const [newCustomerOpen,   setNewCustomerOpen]   = useState(false)
  const [conflicts,         setConflicts]          = useState<EventWithDetails[]>([])
  const [pendingPayload,    setPendingPayload]      = useState<EventFormPayload | null>(null)
  const [saving,            setSaving]             = useState(false)

  // Cast necessário: o resolver condicional une dois schemas zod compatíveis com FormData.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolver = zodResolver(isCreate ? createSchema : baseSchema) as Resolver<FormData, any>

  const { control, register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<FormData>({
      resolver,
      defaultValues: {
        customer_id:   '',
        package_id:    null,
        title:         '',
        date:          initialDate ?? today(),
        start_time:    '',
        end_time:      '',
        guests_count:  null,
        total_reais:   0,
        deposit_reais: 0,
        deposit_paid:  false,
        notes:         '',
      },
    })

  // Preenche form ao abrir no modo edição
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && event) {
      reset({
        customer_id:   event.customer_id,
        package_id:    event.package_id ?? null,
        title:         event.title ?? '',
        date:          event.date,
        start_time:    event.start_time ?? '',
        end_time:      event.end_time ?? '',
        guests_count:  event.guests_count ?? null,
        total_reais:   Number(centsToBRL(event.total_cents)),
        deposit_reais: Number(centsToBRL(event.deposit_cents)),
        deposit_paid:  event.deposit_paid,
        notes:         event.notes ?? '',
      })
    } else {
      reset({
        customer_id:   prefill?.customer_id ?? '',
        package_id:    null,
        title:         '',
        date:          initialDate ?? today(),
        start_time:    '',
        end_time:      '',
        guests_count:  null,
        total_reais:   prefill?.total_cents != null ? prefill.total_cents / 100 : 0,
        deposit_reais: prefill?.deposit_cents != null ? prefill.deposit_cents / 100 : 0,
        deposit_paid:  false,
        notes:         '',
      })
    }
  }, [open, mode, event, initialDate, prefill, reset])

  // Pré-seleciona pacote ao escolher
  function handlePackageChange(pkgId: string) {
    setValue('package_id', pkgId === 'none' ? null : pkgId)
    const pkg = packages.find((p) => p.id === pkgId)
    if (pkg) setValue('total_reais', pkg.base_price_cents / 100)
  }

  function buildPayload(data: FormData): EventFormPayload {
    return {
      customer_id:   data.customer_id,
      package_id:    data.package_id ?? null,
      title:         data.title?.trim() || null,
      date:          data.date,
      start_time:    data.start_time,
      end_time:      data.end_time,
      guests_count:  data.guests_count ?? null,
      total_cents:   brlToCents(data.total_reais),
      deposit_cents: brlToCents(data.deposit_reais),
      deposit_paid:  data.deposit_paid,
      notes:         data.notes?.trim() || null,
    }
  }

  async function checkAndSave(data: FormData) {
    const payload = buildPayload(data)

    // Detectar conflitos com festas confirmadas
    const found = await detectConflicts({
      orgId,
      date:      payload.date,
      startTime: payload.start_time,
      endTime:   payload.end_time,
      excludeId: event?.id,
    })

    if (found.length > 0) {
      setConflicts(found)
      setPendingPayload(payload)
      return
    }

    await save(payload)
  }

  async function save(payload: EventFormPayload) {
    setSaving(true)
    try {
      if (isCreate) {
        await onCreate(payload)
        toast.success('Festa criada com sucesso!')
      } else {
        await onUpdate(event!.id, payload)
        toast.success('Festa atualizada!')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar festa')
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      await checkAndSave(data)
    } finally {
      setSaving(false)
    }
  }

  async function handleConflictConfirm() {
    if (!pendingPayload) return
    setConflicts([])
    await save(pendingPayload)
    setPendingPayload(null)
  }

  function handleConflictCancel() {
    setConflicts([])
    setPendingPayload(null)
  }

  function handleNewCustomerCreated(customer: Customer) {
    setValue('customer_id', customer.id)
  }

  function handleDialogOpenChange(o: boolean) {
    if (!o) onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              {isCreate ? 'Nova festa' : 'Editar festa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-1" noValidate>
            {/* ── Cliente ── */}
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

            {/* ── Pacote ── */}
            <SectionLabel>Pacote (opcional)</SectionLabel>
            <Controller
              name="package_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={handlePackageChange}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sem pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem pacote</SelectItem>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.base_price_cents > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(p.base_price_cents / 100)}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {/* ── Título personalizado ── */}
            <SectionLabel>Detalhes</SectionLabel>
            <div className="space-y-1">
              <Label htmlFor="ev-title">Título (opcional)</Label>
              <Input
                id="ev-title"
                placeholder="ex: Festa da Sofia 6 anos"
                className="h-11"
                {...register('title')}
              />
            </div>

            {/* ── Data e horários ── */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="col-span-3 space-y-1 sm:col-span-1">
                <Label htmlFor="ev-date">Data *</Label>
                <Input
                  id="ev-date"
                  type="date"
                  className="h-11"
                  {...register('date')}
                />
                <FieldError message={errors.date?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ev-start">Início *</Label>
                <Input id="ev-start" type="time" className="h-11" {...register('start_time')} />
                <FieldError message={errors.start_time?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ev-end">Término *</Label>
                <Input id="ev-end" type="time" className="h-11" {...register('end_time')} />
                <FieldError message={errors.end_time?.message} />
              </div>
            </div>

            {/* ── Convidados ── */}
            <div className="mt-3 space-y-1">
              <Label htmlFor="ev-guests">Nº de convidados</Label>
              <Input
                id="ev-guests"
                type="number"
                min={0}
                placeholder="50"
                className="h-11"
                {...register('guests_count')}
              />
            </div>

            {/* ── Valores ── */}
            <SectionLabel>Valores</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ev-total">Valor total (R$) *</Label>
                <Input
                  id="ev-total"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  className="h-11"
                  {...register('total_reais')}
                />
                <FieldError message={errors.total_reais?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ev-deposit">Sinal (R$)</Label>
                <Input
                  id="ev-deposit"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  className="h-11"
                  {...register('deposit_reais')}
                />
                <FieldError message={errors.deposit_reais?.message} />
              </div>
            </div>

            {/* Sinal pago */}
            <Controller
              name="deposit_paid"
              control={control}
              render={({ field }) => (
                <div className="mt-3 flex items-center gap-3 rounded-lg border p-3">
                  <Switch
                    id="ev-deposit-paid"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="ev-deposit-paid" className="cursor-pointer">
                    Sinal já foi recebido
                  </Label>
                </div>
              )}
            />

            {/* ── Observações ── */}
            <SectionLabel>Observações</SectionLabel>
            <Textarea
              placeholder="Tema da festa, restrições alimentares, solicitações especiais…"
              className="min-h-[72px] resize-none"
              {...register('notes')}
            />

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreate ? 'Criar festa' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-diálogo: novo cliente */}
      <NewCustomerDialog
        open={newCustomerOpen}
        orgId={orgId}
        onClose={() => setNewCustomerOpen(false)}
        onCreated={handleNewCustomerCreated}
        onCreate={onAddCustomer}
      />

      {/* Sub-diálogo: conflito de horário */}
      <ConflictWarningDialog
        open={conflicts.length > 0}
        conflicts={conflicts}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
      />
    </>
  )
}
