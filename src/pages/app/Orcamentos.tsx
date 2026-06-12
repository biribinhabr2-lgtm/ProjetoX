/**
 * Orcamentos — módulo de orçamentos com link público de aceite.
 *
 * Regra 2: QuoteRow e ConvertDialog definidos em nível de módulo.
 * Regra 4: queries via services/.
 */

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Search, Copy, Check, Loader2, Trash2, Pencil, CalendarPlus,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { QuoteForm, type QuoteFormPayload } from '@/components/orcamentos/QuoteForm'
import { EventDialog, type EventFormPayload } from '@/components/agenda/EventDialog'
import {
  listQuotes, createQuote, updateQuote, removeQuote,
} from '@/services/quotes'
import { createEvent } from '@/services/events'
import { listCatalogItems } from '@/services/catalog'
import { useCustomers } from '@/hooks/useCustomers'
import { usePackages } from '@/hooks/usePackages'
import { useAuthStore } from '@/stores/authStore'
import type { QuoteStatus, QuoteWithCustomer, CatalogItem } from '@/types/database'

const fmtBRL = (cents: number | null) =>
  cents != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
    : '—'

const ALL_STATUSES: QuoteStatus[] = ['enviado', 'aceito', 'recusado', 'expirado']

const STATUS_LABELS: Record<QuoteStatus, string> = {
  enviado:  'Enviados',
  aceito:   'Aceitos',
  recusado: 'Recusados',
  expirado: 'Expirados',
}

// ── Copia link para área de transferência ─────────────────────
async function copyLink(token: string): Promise<void> {
  const url = `${window.location.origin}/orcamento/${token}`
  await navigator.clipboard.writeText(url)
}

// ── QuoteRow ──────────────────────────────────────────────────
interface QuoteRowProps {
  quote: QuoteWithCustomer
  onEdit:    (q: QuoteWithCustomer) => void
  onDelete:  (q: QuoteWithCustomer) => void
  onConvert: (q: QuoteWithCustomer) => void
}

function QuoteRow({ quote, onEdit, onDelete, onConvert }: QuoteRowProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await copyLink(quote.public_token)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Falha ao copiar link')
    }
  }

  const canConvert = quote.status === 'aceito' && !quote.event_id

  return (
    <tr className="group border-b transition-colors last:border-0 hover:bg-muted/30">
      {/* Cliente */}
      <td className="py-3 pl-4 pr-3">
        <div>
          <p className="text-sm font-medium text-foreground">{quote.customer.name}</p>
          {quote.notes && (
            <p className="truncate text-xs text-muted-foreground max-w-[200px]">{quote.notes}</p>
          )}
        </div>
      </td>

      {/* Total */}
      <td className="hidden px-3 py-3 md:table-cell">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-success)', fontFamily: 'var(--font-display)' }}
        >
          {fmtBRL(quote.total_cents)}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={quote.status} />
      </td>

      {/* Validade */}
      <td className="hidden px-3 py-3 lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {quote.valid_until
            ? format(parseISO(quote.valid_until), "d 'de' MMM 'de' yyyy", { locale: ptBR })
            : '—'}
        </span>
      </td>

      {/* Ações */}
      <td className="py-3 pr-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Copiar link */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
            title="Copiar link público"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>

          {/* Abrir link */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            asChild
            title="Abrir página pública"
          >
            <a
              href={`/orcamento/${quote.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>

          {/* Menu ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Ações</span>
                <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(quote)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {canConvert && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onConvert(quote)}
                    className="font-medium text-primary"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Converter em festa
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(quote)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  )
}

// ── Orcamentos (página) ───────────────────────────────────────
export default function Orcamentos() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id

  const [quotes,   setQuotes]   = useState<QuoteWithCustomer[]>([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('')

  // Diálogos
  const [formOpen,    setFormOpen]    = useState(false)
  const [editingQuote, setEditingQuote] = useState<QuoteWithCustomer | null>(null)
  const [savingForm,  setSavingForm]  = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<QuoteWithCustomer | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  // Conversão para festa
  const [convertQuote, setConvertQuote] = useState<QuoteWithCustomer | null>(null)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])

  const { customers, addCustomer } = useCustomers(orgId)
  const { packages } = usePackages(orgId)

  // ── Carregar ────────────────────────────────────────────────
  const loadQuotes = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await listQuotes(orgId, { search, status: statusFilter })
      setQuotes(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar orçamentos')
    } finally {
      setLoading(false)
    }
  }, [orgId, search, statusFilter])

  useEffect(() => { void loadQuotes() }, [loadQuotes])

  // Catálogo: carrega uma vez ao montar (activeOnly = true)
  useEffect(() => {
    if (!orgId) return
    void listCatalogItems(orgId, true).then(setCatalogItems).catch(() => void 0)
  }, [orgId])

  // ── CRUD ────────────────────────────────────────────────────
  function openCreate() {
    setEditingQuote(null)
    setFormOpen(true)
  }

  function openEdit(quote: QuoteWithCustomer) {
    setEditingQuote(quote)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: QuoteFormPayload) {
    if (!orgId) return
    setSavingForm(true)
    try {
      if (editingQuote) {
        await updateQuote(editingQuote.id, payload)
        toast.success('Orçamento atualizado!')
      } else {
        const created = await createQuote({ org_id: orgId, ...payload })
        // Copia link automaticamente após criar
        await copyLink(created.public_token)
        toast.success('Orçamento criado! Link copiado para a área de transferência.')
      }
      setFormOpen(false)
      setEditingQuote(null)
      void loadQuotes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar orçamento')
    } finally {
      setSavingForm(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeQuote(deleteTarget.id)
      toast.success('Orçamento removido')
      setDeleteTarget(null)
      void loadQuotes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  // ── Converter em festa ──────────────────────────────────────
  function handleConvert(quote: QuoteWithCustomer) {
    setConvertQuote(quote)
    setEventDialogOpen(true)
  }

  async function handleEventCreate(payload: EventFormPayload) {
    if (!orgId || !convertQuote) return
    try {
      await createEvent({
        org_id:        orgId,
        customer_id:   payload.customer_id,
        package_id:    payload.package_id,
        title:         payload.title,
        date:          payload.date,
        start_time:    payload.start_time,
        end_time:      payload.end_time,
        guests_count:  payload.guests_count,
        total_cents:   payload.total_cents,
        deposit_cents: payload.deposit_cents,
        deposit_paid:  payload.deposit_paid,
        notes:         payload.notes,
      })
      toast.success('Festa criada! Acesse a Agenda para visualizá-la.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar festa')
      return
    }
    setEventDialogOpen(false)
    setConvertQuote(null)
    void loadQuotes()
  }

  if (!orgId) return null

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 pb-4 pt-6 sm:px-6">
        <PageHeader
          title="Orçamentos"
          description="Crie e envie propostas com link de aprovação para o cliente"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo orçamento
            </Button>
          }
        />
      </div>

      <div className="p-4 sm:p-6">
        {/* Barra de ferramentas */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente…"
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro status */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setStatusFilter('')}
            >
              Todos
            </Button>
            {ALL_STATUSES.map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>

        {/* Aceitos aguardando conversão */}
        {quotes.filter((q) => q.status === 'aceito' && !q.event_id).length > 0 && (
          <div
            className="mb-4 flex items-center gap-3 rounded-xl border-2 p-3 text-sm"
            style={{
              borderColor: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-light)',
            }}
          >
            <CalendarPlus className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
            <p>
              <strong>
                {quotes.filter((q) => q.status === 'aceito' && !q.event_id).length} orçamento(s) aceito(s)
              </strong>{' '}
              aguardam conversão em festa. Clique em <strong>⋮ → Converter em festa</strong>.
            </p>
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState
            title={search || statusFilter ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento criado'}
            description={
              search || statusFilter
                ? 'Tente ajustar os filtros'
                : 'Crie o primeiro orçamento e envie o link de aprovação'
            }
            actionLabel={!search && !statusFilter ? 'Criar orçamento' : undefined}
            onAction={!search && !statusFilter ? openCreate : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Total
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Válido até
                  </th>
                  <th className="py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <QuoteRow
                    key={q.id}
                    quote={q}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onConvert={handleConvert}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog de formulário */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditingQuote(null) } }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              {editingQuote ? 'Editar orçamento' : 'Novo orçamento'}
            </DialogTitle>
            <DialogDescription>
              {editingQuote
                ? 'Atualize os itens, valores e condições do orçamento.'
                : 'Preencha os dados e itens — o link de aprovação será copiado automaticamente.'}
            </DialogDescription>
          </DialogHeader>
          <QuoteForm
            defaultValues={editingQuote ?? undefined}
            customers={customers}
            orgId={orgId}
            saving={savingForm}
            onSubmit={handleFormSubmit}
            onCancel={() => { setFormOpen(false); setEditingQuote(null) }}
            onAddCustomer={addCustomer}
            catalogItems={catalogItems}
            submitLabel={editingQuote ? 'Salvar alterações' : 'Criar orçamento'}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Excluir orçamento?</DialogTitle>
            <DialogDescription>
              O orçamento de <strong>{deleteTarget?.customer.name}</strong> será removido. O link
              público ficará inativo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EventDialog para conversão de orçamento em festa */}
      {convertQuote && (
        <EventDialog
          open={eventDialogOpen}
          mode="create"
          orgId={orgId}
          customers={customers}
          packages={packages}
          onClose={() => { setEventDialogOpen(false); setConvertQuote(null) }}
          onCreate={handleEventCreate}
          onUpdate={async () => { void 0 }}
          onAddCustomer={addCustomer}
          prefill={{
            customer_id:   convertQuote.customer_id,
            total_cents:   convertQuote.total_cents ?? 0,
            deposit_cents: 0,
          }}
        />
      )}
    </div>
  )
}
