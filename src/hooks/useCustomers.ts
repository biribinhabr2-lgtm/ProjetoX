import { useCallback, useEffect, useState } from 'react'
import { listCustomers, createCustomer, type CreateCustomerPayload } from '@/services/customers'
import type { Customer } from '@/types/database'

/**
 * Hook simples de clientes para a Agenda (CustomerCombobox).
 * Retorna lista plana de Customer[] sem stats (suficiente para o combobox de seleção).
 */
export function useCustomers(orgId: string | undefined) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      // Busca até 1000 clientes (suficiente para qualquer buffet)
      const { data } = await listCustomers(orgId, { pageSize: 1000 })
      setCustomers(data)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { void load() }, [load])

  const addCustomer = useCallback(
    async (payload: CreateCustomerPayload): Promise<Customer> => {
      const created = await createCustomer(payload)
      setCustomers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      )
      return created
    },
    [],
  )

  return { customers, loading, reload: load, addCustomer }
}
