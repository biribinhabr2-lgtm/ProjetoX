import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Plus } from 'lucide-react'

export default function Clientes() {
  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gerencie o cadastro de clientes e crianças"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo cliente
          </Button>
        }
      />
      <EmptyState
        title="Nenhum cliente cadastrado"
        description="Adicione seu primeiro cliente para começar"
        actionLabel="Cadastrar cliente"
        onAction={() => undefined}
      />
    </div>
  )
}
