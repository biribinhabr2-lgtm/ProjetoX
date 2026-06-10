import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Plus } from 'lucide-react'

export default function Orcamentos() {
  return (
    <div>
      <PageHeader
        title="Orçamentos"
        description="Crie e envie orçamentos com link de aprovação"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo orçamento
          </Button>
        }
      />
      <EmptyState
        title="Nenhum orçamento criado"
        description="Crie seu primeiro orçamento e envie o link de aprovação para o cliente"
        actionLabel="Criar orçamento"
        onAction={() => undefined}
      />
    </div>
  )
}
