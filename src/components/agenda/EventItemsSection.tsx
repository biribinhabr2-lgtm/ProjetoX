/**
 * EventItemsSection — lista de itens (do catálogo ou manuais) num evento.
 * Regra 2: todos os sub-componentes definidos em nível de módulo.
 * Regra 4: queries via services/.
 */

import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, ChevronDown, ChevronUp, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { listCatalogItems } from '@/services/catalog'
import type { CatalogItem } from '@/types/database'

// ── Tipo local de item (antes de ir para o banco) ──────────────
export interface LocalEventItem {
  tempId:           string       // chave React local
  catalog_item_id:  string | null
  description:      string
  qty:              number
  unit_price_cents: number
}

let _idCounter = 0
export function newLocalItem(overrides: Partial<LocalEventItem> = {}): LocalEventItem {
  return {
    tempId:          String(++_idCounter),
    catalog_item_id: null,
    description:     '',
    qty:             1,
    unit_price_cents: 0,
    ...overrides,
  }
}

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const UNIT_LABEL: Record<string, string> = {
  un: 'un', hora: 'hr', pessoa: 'pes.', pacote: 'pct',
}

// ── CatalogSelector ────────────────────────────────────────────

interface CatalogSelectorProps {
  orgId:     string
  onPick:    (item: CatalogItem) => void
}

function CatalogSelector({ orgId, onPick }: CatalogSelectorProps) {
  const [open,   setOpen]   = useState(false)
  const [items,  setItems]  = useState<CatalogItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || items.length > 0) return
    listCatalogItems(orgId, true).then(setItems).catch(() => null)
  }, [open, orgId, items.length])

  const filtered = search.trim()
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.category ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : items

  return (
    <div className="rounded-lg border border-dashed">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          Adicionar do catálogo
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar…"
              className="h-7 pl-7 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {items.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Nenhum item ativo.{' '}
              <a href="/app/catalogo" target="_blank" rel="noopener" className="underline">
                Cadastre no catálogo.
              </a>
            </p>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
              {filtered.map((ci) => (
                <button
                  key={ci.id}
                  type="button"
                  onClick={() => { onPick(ci); setSearch('') }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                >
                  <span className="font-medium truncate flex-1">{ci.name}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {fmtBRL(ci.price_cents)}/{UNIT_LABEL[ci.unit] ?? ci.unit}
                  </span>
                  <Plus className="ml-2 h-3 w-3 shrink-0 text-[--color-primary]" />
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">Nada encontrado.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ItemRow ────────────────────────────────────────────────────

interface ItemRowProps {
  item:        LocalEventItem
  onRemove:    () => void
  onQtyChange: (qty: number) => void
}

function ItemRow({ item, onRemove, onQtyChange }: ItemRowProps) {
  const lineTotal = item.qty * item.unit_price_cents

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">
          {fmtBRL(item.unit_price_cents)}/un
          {lineTotal > 0 && ` · ${fmtBRL(lineTotal)}`}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onQtyChange(Math.max(1, item.qty - 1))}
          className="flex h-6 w-6 items-center justify-center rounded border text-xs hover:bg-muted"
        >
          −
        </button>
        <span className="w-6 text-center text-xs font-medium">{item.qty}</span>
        <button
          type="button"
          onClick={() => onQtyChange(item.qty + 1)}
          className="flex h-6 w-6 items-center justify-center rounded border text-xs hover:bg-muted"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
        title="Remover item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── EventItemsSection ──────────────────────────────────────────

export interface EventItemsSectionProps {
  orgId:       string
  items:       LocalEventItem[]
  onChange:    (items: LocalEventItem[]) => void
  /** Quando fornecido, exibe o botão "Usar como total do evento" */
  onUseTotal?: (totalCents: number) => void
}

export function EventItemsSection({
  orgId,
  items,
  onChange,
  onUseTotal,
}: EventItemsSectionProps) {
  const subtotalCents = items.reduce((s, i) => s + i.qty * i.unit_price_cents, 0)

  function addFromCatalog(ci: CatalogItem) {
    // Se já existe o item do catálogo, incrementa qty
    const idx = items.findIndex((i) => i.catalog_item_id === ci.id)
    if (idx >= 0) {
      const updated = items.map((item, i) =>
        i === idx ? { ...item, qty: item.qty + 1 } : item,
      )
      onChange(updated)
      return
    }
    onChange([
      ...items,
      newLocalItem({
        catalog_item_id:  ci.id,
        description:      ci.name,
        qty:              1,
        unit_price_cents: ci.price_cents,
      }),
    ])
  }

  function addManual() {
    onChange([...items, newLocalItem({ description: 'Item personalizado', qty: 1, unit_price_cents: 0 })])
  }

  function remove(tempId: string) {
    onChange(items.filter((i) => i.tempId !== tempId))
  }

  function setQty(tempId: string, qty: number) {
    onChange(items.map((i) => (i.tempId === tempId ? { ...i, qty } : i)))
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Itens / pacotes
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={addManual}
        >
          <Plus className="h-3 w-3" /> Item manual
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item) => (
            <ItemRow
              key={item.tempId}
              item={item}
              onRemove={() => remove(item.tempId)}
              onQtyChange={(qty) => setQty(item.tempId, qty)}
            />
          ))}

          {/* Subtotal */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subtotal dos itens</span>
            <span className="font-semibold">{fmtBRL(subtotalCents)}</span>
          </div>

          {onUseTotal && subtotalCents > 0 && (
            <button
              type="button"
              onClick={() => onUseTotal(subtotalCents)}
              className="w-full rounded-lg border border-dashed border-[--color-primary]/40 px-3 py-1.5 text-xs text-[--color-primary] hover:bg-[--color-primary-light] transition-colors"
            >
              Usar {fmtBRL(subtotalCents)} como valor total do evento
            </button>
          )}
        </div>
      )}

      <CatalogSelector orgId={orgId} onPick={addFromCatalog} />
    </div>
  )
}
