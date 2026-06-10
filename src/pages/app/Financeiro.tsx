import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Plus } from 'lucide-react'

export default function Financeiro() {
  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle suas receitas e despesas"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Lançamento
          </Button>
        }
      />
      <EmptyState
        title="Nenhum lançamento registrado"
        description="Registre receitas e despesas para ter controle completo do seu financeiro"
        actionLabel="Novo lançamento"
        onAction={() => undefined}
      />
    </div>
  )
}
