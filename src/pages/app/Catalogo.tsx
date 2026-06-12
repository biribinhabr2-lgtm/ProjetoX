/**
 * Catálogo de produtos e serviços reutilizáveis.
 *
 * Regra 2: CatalogRow, CatalogDialog, DeleteDialog, SeedButton em nível de módulo.
 * Regra 7: price sempre em centavos no banco; exibição em reais na UI.
 */

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Loader2, Search,
  ChevronUp, ChevronDown, Package,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import {
  listCatalogItems, createCatalogItem, updateCatalogItem,
  toggleCatalogItemActive, removeCatalogItem, swapCatalogOrder,
} from '@/services/catalog'
import type { CatalogItem, CatalogUnit } from '@/types/database'

// ── Helpers ───────────────────────────────────────────────────
const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const UNIT_OPTIONS: { value: CatalogUnit; label: string }[] = [
  { value: 'un',      label: 'Unidade (un)' },
  { value: 'hora',    label: 'Hora (hr)'    },
  { value: 'pessoa',  label: 'Pessoa'       },
  { value: 'pacote',  label: 'Pacote'       },
]

const UNIT_LABEL: Record<CatalogUnit, string> = {
  un:     'un',
  hora:   'hr',
  pessoa: 'pes.',
  pacote: 'pct',
}

// ── Seed ──────────────────────────────────────────────────────
const SEED_ITEMS: Array<Omit<CatalogItem, 'id' | 'created_at' | 'org_id' | 'active' | 'sort_order'>> = [
  { name: 'Festa pacote básico',  description: null, price_cents: 200000, unit: 'pacote', category: 'Pacotes'     },
  { name: 'Hora extra',           description: null, price_cents:  30000, unit: 'hora',   category: 'Serviços'    },
  { name: 'Convidado extra',      description: null, price_cents:   5000, unit: 'pessoa', category: 'Serviços'    },
  { name: 'Decoração temática',   description: null, price_cents:  80000, unit: 'pacote', category: 'Decoração'   },
  { name: 'Recreador adicional',  description: null, price_cents:  25000, unit: 'hora',   category: 'Serviços'    },
  { name: 'Bolo cenográfico',     description: null, price_cents:  45000, unit: 'un',     category: 'Alimentação' },
]

// ── Schema do formulário ──────────────────────────────────────
const schema = z.object({
  name:        z.string().min(1, 'Nome obrigatório').max(100),
  description: z.string().optional(),
  price_reais: z.coerce.number().min(0, 'Mín. R$ 0'),
  unit:        z.enum(['un', 'hora', 'pessoa', 'pacote']),
  category:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── CatalogRow ────────────────────────────────────────────────
interface CatalogRowProps {
  item:       CatalogItem
  isFirst:    boolean
  isLast:     boolean
  onEdit:     (item: CatalogItem) => void
  onDelete:   (item: CatalogItem) => void
  onToggle:   (item: CatalogItem, active: boolean) => void
  onMoveUp:   (item: CatalogItem) => void
  onMoveDown: (item: CatalogItem) => void
}

function CatalogRow({
  item, isFirst, isLast, onEdit, onDelete, onToggle, onMoveUp, onMoveDown,
}: CatalogRowProps) {
  return (
    <tr className={`group border-b transition-colors last:border-0 hover:bg-muted/30 ${!item.active ? 'opacity-50' : ''}`}>
      {/* Ordenação */}
      <td className="w-14 pl-3 py-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMoveUp(item)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMoveDown(item)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>

      {/* Nome */}
      <td className="py-3 px-3">
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{item.description}</p>
          )}
        </div>
      </td>

      {/* Preço */}
      <td className="hidden px-3 py-3 sm:table-cell">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-display)' }}>
          {fmtBRL(item.price_cents)}
        </span>
        <span className="ml-1 text-xs text-muted-foreground">/{UNIT_LABEL[item.unit]}</span>
      </td>

      {/* Categoria */}
      <td className="hidden px-3 py-3 md:table-cell">
        {item.category && (
          <Badge variant="outline" className="text-xs">{item.category}</Badge>
        )}
      </td>

      {/* Ativo */}
      <td className="px-3 py-3">
        <Switch
          checked={item.active}
          onCheckedChange={(v) => onToggle(item, v)}
          aria-label={item.active ? 'Desativar item' : 'Ativar item'}
        />
      </td>

      {/* Ações */}
      <td className="pr-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── CatalogDialog ─────────────────────────────────────────────
interface CatalogDialogProps {
  open:      boolean
  editing:   CatalogItem | null
  saving:    boolean
  onClose:   () => void
  onSubmit:  (data: FormData) => Promise<void>
}

function CatalogDialog({ open, editing, saving, onClose, onSubmit }: CatalogDialogProps) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { name: '', description: '', price_reais: 0, unit: 'un', category: '' },
    })

  // Preenche ao editar
  useEffect(() => {
    if (editing) {
      reset({
        name:        editing.name,
        description: editing.description ?? '',
        price_reais: editing.price_cents / 100,
        unit:        editing.unit,
        category:    editing.category ?? '',
      })
    } else {
      reset({ name: '', description: '', price_reais: 0, unit: 'un', category: '' })
    }
  }, [editing, open, reset])

  const unitValue = watch('unit')

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            {editing ? 'Editar item' : 'Novo item do catálogo'}
          </DialogTitle>
          <DialogDescription>
            Itens do catálogo podem ser inseridos em orçamentos com 1 clique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="ci-name">Nome *</Label>
            <Input id="ci-name" placeholder="Festa pacote básico" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ci-desc">Descrição <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id="ci-desc" placeholder="Detalhes do item" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ci-price">Preço (R$) *</Label>
              <Input
                id="ci-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                {...register('price_reais')}
              />
              {errors.price_reais && <p className="text-xs text-destructive">{errors.price_reais.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select
                value={unitValue}
                onValueChange={(v) => setValue('unit', v as CatalogUnit)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ci-cat">Categoria <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="ci-cat"
              placeholder="ex.: Pacotes, Serviços, Decoração"
              {...register('category')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── DeleteDialog ──────────────────────────────────────────────
interface DeleteDialogProps {
  item:     CatalogItem | null
  deleting: boolean
  onClose:  () => void
  onConfirm: () => Promise<void>
}

function DeleteDialog({ item, deleting, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Excluir item?</DialogTitle>
          <DialogDescription>
            <strong>{item?.name}</strong> será removido do catálogo permanentemente.
            {' '}Orçamentos já criados com este item <strong>não serão afetados</strong>.
            Se quiser apenas ocultá-lo, use o switch Ativo/Inativo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Catalogo ──────────────────────────────────────────────────
export default function Catalogo() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id

  const [items,      setItems]      = useState<CatalogItem[]>([])
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing,    setEditing]    = useState<CatalogItem | null>(null)
  const [saving,     setSaving]     = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  const [seeding, setSeeding] = useState(false)

  // ── Carregar ──────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      setItems(await listCatalogItems(orgId))
    } catch {
      toast.error('Erro ao carregar catálogo')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { void loadItems() }, [loadItems])

  // ── Filtros locais ────────────────────────────────────────
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[]

  const filtered = items.filter((i) => {
    const matchSearch = !search.trim() ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || i.category === catFilter
    return matchSearch && matchCat
  })

  // ── CRUD ──────────────────────────────────────────────────
  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(item: CatalogItem) {
    setEditing(item)
    setDialogOpen(true)
  }

  async function handleDialogSubmit(data: FormData) {
    if (!orgId) return
    setSaving(true)
    try {
      const payload = {
        name:        data.name.trim(),
        description: data.description?.trim() || null,
        price_cents: Math.round(data.price_reais * 100),
        unit:        data.unit,
        category:    data.category?.trim() || null,
      }
      if (editing) {
        const updated = await updateCatalogItem(editing.id, payload)
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        toast.success('Item atualizado!')
      } else {
        const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order), -1)
        const created = await createCatalogItem(orgId, { ...payload, sort_order: maxOrder + 1 })
        setItems((prev) => [...prev, created])
        toast.success('Item criado!')
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: CatalogItem, active: boolean) {
    try {
      await toggleCatalogItemActive(item.id, active)
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active } : i)))
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeCatalogItem(deleteTarget.id)
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      toast.success('Item removido')
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  async function handleMoveUp(item: CatalogItem) {
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx <= 0) return
    const prev = items[idx - 1]
    try {
      await swapCatalogOrder(item, prev)
      setItems((list) => {
        const updated = [...list]
        updated[idx]     = { ...updated[idx],     sort_order: prev.sort_order }
        updated[idx - 1] = { ...updated[idx - 1], sort_order: item.sort_order }
        return [...updated].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      })
    } catch {
      toast.error('Erro ao reordenar')
    }
  }

  async function handleMoveDown(item: CatalogItem) {
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx < 0 || idx >= items.length - 1) return
    const next = items[idx + 1]
    try {
      await swapCatalogOrder(item, next)
      setItems((list) => {
        const updated = [...list]
        updated[idx]     = { ...updated[idx],     sort_order: next.sort_order }
        updated[idx + 1] = { ...updated[idx + 1], sort_order: item.sort_order }
        return [...updated].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      })
    } catch {
      toast.error('Erro ao reordenar')
    }
  }

  // ── Seed ──────────────────────────────────────────────────
  async function handleSeed() {
    if (!orgId) return
    setSeeding(true)
    try {
      let order = items.reduce((m, i) => Math.max(m, i.sort_order), -1)
      const created: CatalogItem[] = []
      for (const seed of SEED_ITEMS) {
        order++
        created.push(
          await createCatalogItem(orgId, { ...seed, active: true, sort_order: order }),
        )
      }
      setItems((prev) => [...prev, ...created])
      toast.success(`${created.length} itens de exemplo adicionados!`)
    } catch {
      toast.error('Erro ao adicionar itens de exemplo')
    } finally {
      setSeeding(false)
    }
  }

  if (!orgId) return null

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 pb-4 pt-6 sm:px-6">
        <PageHeader
          title="Catálogo"
          description="Produtos e serviços reutilizáveis para inserção rápida em orçamentos"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo item
            </Button>
          }
        />
      </div>

      <div className="p-4 sm:p-6">
        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar item…"
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={catFilter === '' ? 'default' : 'outline'}
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => setCatFilter('')}
              >
                Todos
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={catFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => setCatFilter(cat === catFilter ? '' : cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Empty state com seed */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-14 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--color-primary-light)' }}
            >
              <Package className="h-7 w-7" style={{ color: 'var(--color-primary)' }} />
            </span>
            <div>
              <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Catálogo vazio
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione seus produtos/serviços ou comece com os itens de exemplo.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar item
              </Button>
              <Button variant="outline" disabled={seeding} onClick={handleSeed} className="gap-2">
                {seeding
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Package className="h-4 w-4" />}
                Adicionar itens de exemplo
              </Button>
            </div>
          </div>
        )}

        {/* Tabela */}
        {!loading && items.length > 0 && (
          <>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-14 pl-3 py-2.5" />
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Nome
                      </th>
                      <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                        Preço
                      </th>
                      <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        Categoria
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Ativo
                      </th>
                      <th className="pr-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, idx) => (
                      <CatalogRow
                        key={item.id}
                        item={item}
                        isFirst={idx === 0}
                        isLast={idx === filtered.length - 1}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                        onToggle={handleToggle}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Seed disponível mesmo com itens existentes */}
            {items.length > 0 && items.length < 3 && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" disabled={seeding} onClick={handleSeed} className="gap-2 text-muted-foreground">
                  {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                  Adicionar itens de exemplo
                </Button>
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        )}
      </div>

      <CatalogDialog
        open={dialogOpen}
        editing={editing}
        saving={saving}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSubmit={handleDialogSubmit}
      />

      <DeleteDialog
        item={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
