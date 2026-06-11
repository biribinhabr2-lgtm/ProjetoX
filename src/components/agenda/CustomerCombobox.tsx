import { useState } from 'react'
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types/database'

interface CustomerComboboxProps {
  customers:   Customer[]
  value:       string          // customer id
  onChange:    (id: string) => void
  onCreateNew: () => void
  error?:      boolean
}

export function CustomerCombobox({
  customers,
  value,
  onChange,
  onCreateNew,
  error,
}: CustomerComboboxProps) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')

  const selected = customers.find((c) => c.id === value)

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.child_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleSelect(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-11 w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            error && 'border-destructive',
          )}
        >
          <span className="truncate">
            {selected
              ? `${selected.name}${selected.child_name ? ` — ${selected.child_name}` : ''}`
              : 'Selecione um cliente…'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* Search */}
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Buscar cliente"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* List */}
        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhum cliente encontrado
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent',
                  value === c.id && 'bg-accent',
                )}
              >
                <Check
                  className={cn('h-4 w-4 shrink-0', value === c.id ? 'opacity-100 text-primary' : 'opacity-0')}
                />
                <div className="min-w-0 text-left">
                  <p className="truncate font-medium">{c.name}</p>
                  {c.child_name && (
                    <p className="truncate text-xs text-muted-foreground">{c.child_name}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Create new */}
        <div className="border-t p-1">
          <button
            type="button"
            onClick={() => { setOpen(false); onCreateNew() }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-light"
            style={{ color: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" />
            Cadastrar novo cliente
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
