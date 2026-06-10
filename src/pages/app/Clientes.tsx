/**
 * Clientes — módulo completo de gestão de clientes.
 *
 * Features:
 * - Radar de aniversários (próximos 45 dias) no topo
 * - Tabela com busca, paginação e ordenação
 * - Badge "Aniversário próximo" por linha
 * - Drawer de detalhes com histórico e stats
 * - CRUD: criar, editar, excluir (com soft-block se houver festas)
 *
 * Regra 2: sem componentes aninhados (todos em nível de módulo ou em arquivos separados).
 * Regra 4: queries via services/.
 */

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Search, SortAsc, SortDesc, MessageCircle, Cake,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { BirthdayRadar } from '@/components/clientes/BirthdayRadar'
import { CustomerDrawer } from '@/components/clientes/CustomerDrawer'
import { CustomerForm, type CustomerFormValues } from '@/components/clientes/CustomerForm'
import {
  listCustomers, createCustomer, updateCustomer, removeCustomer,
  CustomerHasEventsError,
  type ListCustomersOptions,
} from '@/services/customers'
import { isBirthdaySoon, whatsappLink } from '@/lib/birthday'
import { useAuthStore } from '@/stores/authStore'
import type { CustomerWithStats } from '@/types/database'

const PAGE_SIZE = 25

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

// ── CustomerRow ───────────────────────────────────────────────
interface CustomerRowProps {
  customer: CustomerWithStats
  onOpen: (c: CustomerWithStats) => void
}

function CustomerRow({ customer, onOpen }: CustomerRowProps) {
  const birthdaySoon = customer.child_birthdate
    ? isBirthdaySoon(customer.child_birthdate, 45)
    : false

  return (
    <tr
      className="group cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30"
      onClick={() => onOpen(customer)}
    >
      {/* Avatar + nome */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {customer.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
              {birthdaySoon && (
                <Badge
                  className="hidden shrink-0 text-[10px] font-semibold text-white sm:flex"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Cake className="mr-1 h-3 w-3" />
                  Aniversário próximo
                </Badge>
              )}
            </div>
            {customer.child_name && (
              <p className="truncate text-xs text-muted-foreground">
                Criança: {customer.child_name}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Telefone */}
      <td className="hidden px-3 py-3 sm:table-cell">
        {customer.phone ? (
          <a
            href={whatsappLink(customer.phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-green-600"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {customer.phone}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Festas + total */}
      <td className="hidden px-3 py-3 text-right md:table-cell">
        {customer.events_count > 0 ? (
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
              {fmtBRL(customer.total_spent_cents)}
            </p>
            <p className="text-xs text-muted-foreground">
              {customer.events_count} festa{customer.events_count > 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Última festa */}
      <td className="hidden px-3 py-3 pr-4 text-right lg:table-cell">
        <span className="text-sm text-muted-foreground">
          {customer.last_event_date
            ? format(parseISO(customer.last_event_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })
            : '—'}
        </span>
      </td>
    </tr>
  )
}

// ── DeleteConfirmDialog ───────────────────────────────────────
interface DeleteConfirmDialogProps {
  open: boolean
  customer: CustomerWithStats | null
  eventsCount?: number     // se > 0 → soft-block com aviso
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmDialog({
  open, customer, eventsCount = 0, deleting, onConfirm, onCancel,
}: DeleteConfirmDialogProps) {
  const hasEvents = eventsCount > 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              {hasEvents ? 'Não é possível excluir' : 'Excluir cliente?'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription asChild>
          <div>
            {hasEvents ? (
              <p className="text-sm text-muted-foreground">
                <strong>{customer?.name}</strong> possui{' '}
                <strong>{eventsCount} festa{eventsCount > 1 ? 's' : ''}</strong>{' '}
                vinculada{eventsCount > 1 ? 's' : ''} e não pode ser removido.
                <br />
                <br />
                Para manter o histórico, você pode arquivar o cliente adicionando uma
                observação — ou cancele as festas vinculadas antes de excluí-lo.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta ação é irreversível. O cadastro de{' '}
                <strong>{customer?.name}</strong> será permanentemente removido.
              </p>
            )}
          </div>
        </DialogDescription>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {hasEvents ? 'Entendi' : 'Cancelar'}
          </Button>
          {!hasEvents && (
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir mesmo assim
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Clientes (página) ─────────────────────────────────────────
export default function Clientes() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id

  // Dados paginados
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(false)

  // Filtros e paginação
  const [search,  setSearch]  = useState('')
  const [orderBy, setOrderBy] = useState<ListCustomersOptions['orderBy']>('name')
  const [page,    setPage]    = useState(1)

  // Estado dos diálogos
  const [drawerCustomer, setDrawerCustomer]   = useState<CustomerWithStats | null>(null)
  const [drawerOpen,     setDrawerOpen]       = useState(false)
  const [formOpen,       setFormOpen]         = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null)
  const [savingForm,     setSavingForm]       = useState(false)
  const [deleteTarget,   setDeleteTarget]     = useState<CustomerWithStats | null>(null)
  const [deleteEvCount,  setDeleteEvCount]    = useState(0)
  const [deleting,       setDeleting]         = useState(false)

  // ── Carregar dados ────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const result = await listCustomers(orgId, { search, page, pageSize: PAGE_SIZE, orderBy })
      setCustomers(result.data)
      setTotal(result.total)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [orgId, search, page, orderBy])

  useEffect(() => { void loadCustomers() }, [loadCustomers])

  // Reset página ao mudar busca
  useEffect(() => { setPage(1) }, [search, orderBy])

  // ── Todos os clientes (para o BirthdayRadar) ──────────────
  const [allCustomers, setAllCustomers] = useState<CustomerWithStats[]>([])

  useEffect(() => {
    if (!orgId) return
    // Radar usa lista completa sem paginação
    listCustomers(orgId, { pageSize: 1000 })
      .then((r) => setAllCustomers(r.data))
      .catch(() => { /* silencioso para o radar */ })
  }, [orgId, customers]) // recalcula quando customers muda (após CRUD)

  // ── Handlers de CRUD ──────────────────────────────────────
  function openCreate() {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  function openEdit(customer: CustomerWithStats) {
    setEditingCustomer(customer)
    setDrawerOpen(false)
    setFormOpen(true)
  }

  async function handleFormSubmit(values: CustomerFormValues) {
    if (!orgId) return
    setSavingForm(true)
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, values)
        toast.success('Cliente atualizado!')
      } else {
        await createCustomer({ org_id: orgId, ...values })
        toast.success('Cliente cadastrado!')
      }
      setFormOpen(false)
      setEditingCustomer(null)
      void loadCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar cliente')
    } finally {
      setSavingForm(false)
    }
  }

  function openDelete(customer: CustomerWithStats) {
    setDeleteTarget(customer)
    setDeleteEvCount(0)
    setDrawerOpen(false)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeCustomer(deleteTarget.id)
      toast.success('Cliente removido')
      setDeleteTarget(null)
      void loadCustomers()
    } catch (err) {
      if (err instanceof CustomerHasEventsError) {
        setDeleteEvCount(err.eventsCount)
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
        setDeleteTarget(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  function openDrawer(customer: CustomerWithStats) {
    setDrawerCustomer(customer)
    setDrawerOpen(true)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (!orgId) return null

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 pb-4 pt-6 sm:px-6">
        <PageHeader
          title="Clientes"
          description="Cadastro de clientes e radar de aniversários"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          }
        />
      </div>

      <div className="p-4 sm:p-6">
        {/* ── Radar de aniversários ── */}
        <BirthdayRadar customers={allCustomers} onOpenCustomer={openDrawer} />

        {/* ── Barra de ferramentas ── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone…"
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Ordenação */}
          <div className="flex gap-1.5">
            <Button
              variant={orderBy === 'name' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setOrderBy('name')}
            >
              <SortAsc className="h-3.5 w-3.5" />
              Nome
            </Button>
            <Button
              variant={orderBy === 'last_event' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setOrderBy('last_event')}
            >
              <SortDesc className="h-3.5 w-3.5" />
              Última festa
            </Button>
          </div>
        </div>

        {/* ── Tabela ── */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            description={
              search
                ? 'Tente outro nome ou número de telefone'
                : 'Cadastre seu primeiro cliente para começar'
            }
            actionLabel={!search ? 'Cadastrar cliente' : undefined}
            onAction={!search ? openCreate : undefined}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cliente
                    </th>
                    <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                      Telefone
                    </th>
                    <th className="hidden px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                      Festas / Total
                    </th>
                    <th className="hidden px-3 py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                      Última festa
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <CustomerRow key={c.id} customer={c} onOpen={openDrawer} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drawer de detalhes ── */}
      <CustomerDrawer
        customer={drawerCustomer}
        orgId={orgId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* ── Dialog de formulário (criar / editar) ── */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditingCustomer(null) } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              {editingCustomer ? 'Editar cliente' : 'Novo cliente'}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            defaultValues={editingCustomer ?? undefined}
            saving={savingForm}
            onSubmit={handleFormSubmit}
            onCancel={() => { setFormOpen(false); setEditingCustomer(null) }}
            submitLabel={editingCustomer ? 'Salvar alterações' : 'Cadastrar cliente'}
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog de confirmação de exclusão ── */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        customer={deleteTarget}
        eventsCount={deleteEvCount}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteTarget(null); setDeleteEvCount(0) }}
      />
    </div>
  )
}
