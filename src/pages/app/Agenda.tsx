/**
 * Agenda — página principal de gestão de festas.
 *
 * Tabs: Calendário (mensal) | Lista
 * - Navegação mês a mês com setas
 * - Seleção de dia abre DayPanel lateral
 * - EventDialog para criar / editar
 * - Ações rápidas delegadas aos hooks
 */

import { useState } from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { MonthCalendar } from '@/components/agenda/MonthCalendar'
import { DayPanel } from '@/components/agenda/DayPanel'
import { EventListView } from '@/components/agenda/EventListView'
import { EventDialog, type EventFormPayload } from '@/components/agenda/EventDialog'
import { useEvents } from '@/hooks/useEvents'
import { useCustomers } from '@/hooks/useCustomers'
import { usePackages } from '@/hooks/usePackages'
import { useAuthStore } from '@/stores/authStore'
import type { EventWithDetails } from '@/types/database'

// ── Agenda ────────────────────────────────────────────────────
export default function Agenda() {
  const organization = useAuthStore((s) => s.organization)
  const orgId = organization?.id

  // Mês atual navegável
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1 // 1-indexed

  // Dia selecionado no calendário
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Diálogo de criação/edição
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [dialogMode,   setDialogMode]   = useState<'create' | 'edit'>('create')
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | undefined>()
  const [dialogDate,   setDialogDate]   = useState<string | undefined>()

  // Dados
  const {
    events, loading, error,
    addEvent, editEvent, deleteEvent, changeStatus, confirmWithTransactions,
  } = useEvents(orgId, year, month)

  const { customers, addCustomer } = useCustomers(orgId)
  const { packages }               = usePackages(orgId)

  // ── Navegação de mês ────────────────────────────────────────
  function prevMonth() { setCurrentMonth((d) => subMonths(d, 1)); setSelectedDate(null) }
  function nextMonth() { setCurrentMonth((d) => addMonths(d,  1)); setSelectedDate(null) }

  // ── Abrir diálogo ───────────────────────────────────────────
  function openCreate(date?: string) {
    setDialogMode('create')
    setEditingEvent(undefined)
    setDialogDate(date)
    setDialogOpen(true)
  }

  function openEdit(event: EventWithDetails) {
    setDialogMode('edit')
    setEditingEvent(event)
    setDialogDate(undefined)
    setDialogOpen(true)
  }

  // ── Handlers EventDialog ────────────────────────────────────
  async function handleCreate(payload: EventFormPayload) {
    if (!orgId) return
    await addEvent({
      org_id:        orgId,
      customer_id:   payload.customer_id,
      package_id:    payload.package_id,
      title:         payload.title,
      date:          payload.date,
      start_time:    payload.start_time,
      end_time:      payload.end_time,
      guests_count:  payload.guests_count,
      total_cents:   payload.total_cents,
      deposit_cents: payload.deposit_cents,
      deposit_paid:  payload.deposit_paid,
      notes:         payload.notes,
    })
  }

  async function handleUpdate(id: string, payload: EventFormPayload) {
    await editEvent(id, {
      customer_id:   payload.customer_id,
      package_id:    payload.package_id,
      title:         payload.title,
      date:          payload.date,
      start_time:    payload.start_time,
      end_time:      payload.end_time,
      guests_count:  payload.guests_count,
      total_cents:   payload.total_cents,
      deposit_cents: payload.deposit_cents,
      deposit_paid:  payload.deposit_paid,
      notes:         payload.notes,
    })
  }

  // ── Ações rápidas ────────────────────────────────────────────
  async function handleConfirm(event: EventWithDetails) {
    try {
      await confirmWithTransactions(event)
      toast.success('Festa confirmada! Transações criadas.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao confirmar')
    }
  }

  async function handleMarkDepositPaid(event: EventWithDetails) {
    try {
      await editEvent(event.id, { deposit_paid: true })
      toast.success('Sinal marcado como recebido')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function handleMarkRealizada(event: EventWithDetails) {
    try {
      await changeStatus(event.id, 'realizada')
      toast.success('Festa marcada como realizada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function handleCancel(event: EventWithDetails) {
    try {
      await changeStatus(event.id, 'cancelada')
      toast.success('Festa cancelada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function handleDelete(event: EventWithDetails) {
    try {
      await deleteEvent(event.id)
      // Fecha o painel se o dia ficou vazio
      if (selectedDate === event.date) {
        const remaining = events.filter((e) => e.id !== event.id && e.date === event.date)
        if (remaining.length === 0) setSelectedDate(null)
      }
      toast.success('Festa removida')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  // ── Eventos do dia selecionado ───────────────────────────────
  const dayEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate)
    : []

  // ── Título do mês ────────────────────────────────────────────
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR })

  // ── Sem org ─────────────────────────────────────────────────
  if (!orgId) {
    return (
      <div className="p-6">
        <EmptyState
          title="Organização não encontrada"
          description="Recarregue a página ou faça login novamente."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 pb-4 pt-6 sm:px-6">
        <PageHeader
          title="Agenda"
          description="Gerencie suas festas e orçamentos"
          action={
            <Button onClick={() => openCreate()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova festa
            </Button>
          }
        />
      </div>

      {/* Conteúdo com tabs */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs defaultValue="calendario" className="flex h-full flex-col">
          {/* Barra: tabs + navegação mês */}
          <div className="flex flex-col gap-3 border-b bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="calendario" className="flex-1 sm:flex-none">
                Calendário
              </TabsTrigger>
              <TabsTrigger value="lista" className="flex-1 sm:flex-none">
                Lista
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span
                className="min-w-[140px] text-center text-sm font-semibold capitalize"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {monthLabel}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>

              {error && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Tentar novamente"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>

          {/* ── Tab: Calendário ── */}
          <TabsContent
            value="calendario"
            className="relative mt-0 flex min-h-0 flex-1 overflow-hidden"
          >
            <div
              className={`min-h-0 flex-1 overflow-y-auto transition-all duration-200 ${
                selectedDate ? 'sm:mr-80' : ''
              }`}
            >
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <MonthCalendar
                  currentDate={currentMonth}
                  events={events}
                  selectedDate={selectedDate}
                  onDateChange={setCurrentMonth}
                  onDayClick={setSelectedDate}
                  onEventClick={openEdit}
                />
              )}
            </div>

            <DayPanel
              dateStr={selectedDate}
              events={dayEvents}
              onClose={() => setSelectedDate(null)}
              onEdit={openEdit}
              onConfirm={handleConfirm}
              onMarkDepositPaid={handleMarkDepositPaid}
              onMarkRealizada={handleMarkRealizada}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onNewEvent={(d) => openCreate(d)}
            />
          </TabsContent>

          {/* ── Tab: Lista ── */}
          <TabsContent
            value="lista"
            className="mt-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
          >
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <EventListView
                events={events}
                onEdit={openEdit}
                onConfirm={handleConfirm}
                onMarkDepositPaid={handleMarkDepositPaid}
                onMarkRealizada={handleMarkRealizada}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onNew={() => openCreate()}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* EventDialog (criação e edição) */}
      <EventDialog
        open={dialogOpen}
        mode={dialogMode}
        orgId={orgId}
        initialDate={dialogDate}
        event={editingEvent}
        customers={customers}
        packages={packages}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onAddCustomer={addCustomer}
      />
    </div>
  )
}
