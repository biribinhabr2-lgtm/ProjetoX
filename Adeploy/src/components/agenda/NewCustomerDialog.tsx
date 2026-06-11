import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Customer } from '@/types/database'

const schema = z.object({
  name:       z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone:      z.string().optional(),
  child_name: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface NewCustomerDialogProps {
  open:     boolean
  orgId:    string
  onClose:  () => void
  onCreated: (customer: Customer) => void
  onCreate: (payload: { org_id: string; name: string; phone?: string; child_name?: string }) => Promise<Customer>
}

export function NewCustomerDialog({
  open, orgId, onClose, onCreated, onCreate,
}: NewCustomerDialogProps) {
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const created = await onCreate({
        org_id: orgId,
        name:       data.name,
        phone:      data.phone || undefined,
        child_name: data.child_name || undefined,
      })
      onCreated(created)
      reset()
      onClose()
    } catch {
      // erro tratado pelo chamador
    } finally {
      setSaving(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) { reset(); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            Novo cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="nc-name">Nome do responsável *</Label>
            <Input id="nc-name" placeholder="Maria Silva" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="nc-phone">Telefone</Label>
            <Input id="nc-phone" type="tel" placeholder="(11) 99999-0000" {...register('phone')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="nc-child">Nome da criança</Label>
            <Input id="nc-child" placeholder="João" {...register('child_name')} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
