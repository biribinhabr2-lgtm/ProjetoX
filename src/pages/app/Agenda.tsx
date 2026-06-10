import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Plus } from 'lucide-react'

export default function Agenda() {
  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Visualize e gerencie todas as suas festas"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova festa
          </Button>
        }
      />
      <EmptyState
        title="Nenhuma festa agendada"
        description="Crie sua primeira festa para começar a organizar sua agenda"
        actionLabel="Criar primeira festa"
        onAction={() => undefined}
      />
    </div>
  )
}
