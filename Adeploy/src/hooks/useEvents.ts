import { useCallback, useEffect, useState } from 'react'
import {
  listByMonth,
  createEvent,
  updateEvent,
  removeEvent,
  updateEventStatus,
  confirmEventWithTransactions,
  type CreateEventPayload,
  type UpdateEventPayload,
} from '@/services/events'
import type { EventStatus, EventWithDetails } from '@/types/database'

export function useEvents(orgId: string | undefined, year: number, month: number) {
  const [events,  setEvents]  = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listByMonth(orgId, year, month)
      setEvents(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar festas')
    } finally {
      setLoading(false)
    }
  }, [orgId, year, month])

  useEffect(() => { void load() }, [load])

  const addEvent = useCallback(
    async (payload: CreateEventPayload): Promise<EventWithDetails> => {
      const created = await createEvent(payload)
      setEvents((prev) =>
        [...prev, created].sort((a, b) =>
          a.date === b.date
            ? (a.start_time ?? '').localeCompare(b.start_time ?? '')
            : a.date.localeCompare(b.date),
        ),
      )
      return created
    },
    [],
  )

  const editEvent = useCallback(
    async (id: string, payload: UpdateEventPayload): Promise<EventWithDetails> => {
      const updated = await updateEvent(id, payload)
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
      return updated
    },
    [],
  )

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    await removeEvent(id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const changeStatus = useCallback(
    async (id: string, status: EventStatus): Promise<EventWithDetails> => {
      const updated = await updateEventStatus(id, status)
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
      return updated
    },
    [],
  )

  const confirmWithTransactions = useCallback(
    async (event: EventWithDetails): Promise<void> => {
      const updated = await confirmEventWithTransactions(event)
      setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)))
    },
    [],
  )

  return {
    events,
    loading,
    error,
    refresh: load,
    addEvent,
    editEvent,
    deleteEvent,
    changeStatus,
    confirmWithTransactions,
  }
}
