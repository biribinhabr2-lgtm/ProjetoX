import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import type { EventWithDetails } from '@/types/database'

interface ConflictWarningDialogProps {
  open:       boolean
  conflicts:  EventWithDetails[]
  onConfirm:  () => void
  onCancel:   () => void
}

export function ConflictWarningDialog({
  open, conflicts, onConfirm, onCancel,
}: ConflictWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              Conflito de horário detectado
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Já existe{conflicts.length > 1 ? 'm' : ''} <strong>{conflicts.length}</strong> festa{conflicts.length > 1 ? 's' : ''} confirmada{conflicts.length > 1 ? 's' : ''} com horário sobreposto:
        </p>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          {conflicts.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ev.title ?? ev.customer.name}</p>
                {ev.start_time && (
                  <p className="text-xs text-muted-foreground">
                    {ev.start_time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ''}
                  </p>
                )}
              </div>
              <StatusBadge status={ev.status} />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Você pode salvar mesmo assim — a festa será criada com sobreposição de horário.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Revisar</Button>
          <Button onClick={onConfirm}>Salvar mesmo assim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
