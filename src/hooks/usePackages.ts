import { useCallback, useEffect, useState } from 'react'
import { listPackages } from '@/services/packages'
import type { Package } from '@/types/database'

export function usePackages(orgId: string | undefined) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading,  setLoading]  = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await listPackages(orgId)
      setPackages(data)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { void load() }, [load])

  return { packages, loading }
}
