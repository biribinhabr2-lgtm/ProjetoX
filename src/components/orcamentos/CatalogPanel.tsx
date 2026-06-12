/**
 * CatalogPanel — painel de catálogo para inserção rápida de itens no orçamento.
 *
 * Regra 2: componente em nível de módulo, não aninhado.
 * Uso: dentro do QuoteForm, em seção colapsável.
 */

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { CatalogItem } from '@/types/database'

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const UNIT_LABEL: Record<string, string> = {
  un:      'un',
  hora:    'hr',
  pessoa:  'pes.',
  pacote:  'pct',
}

interface CatalogPanelProps {
  items:    CatalogItem[]
  onInsert: (item: CatalogItem) => void
}

export function CatalogPanel({ items, onInsert }: CatalogPanelProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.category ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : items

  if (items.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        Nenhum item no catálogo. Acesse{' '}
        <a href="/app/catalogo" className="underline" target="_blank" rel="noopener">
          Catálogo
        </a>{' '}
        para cadastrar.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar no catálogo…"
          className="h-8 pl-8 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">Nenhum resultado</p>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-lg border divide-y">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmtBRL(item.price_cents)}/{UNIT_LABEL[item.unit] ?? item.unit}
                  {item.category ? ` · ${item.category}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onInsert(item)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                title={`Inserir "${item.name}"`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
