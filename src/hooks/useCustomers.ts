import { useCallback, useEffect, useState } from 'react'
import { listCustomers, createCustomer, type CreateCustomerPayload } from '@/services/customers'
import type { Customer } from '@/types/database'

export function useCustomers(orgId: string | undefined) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await listCustomers(orgId)
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
