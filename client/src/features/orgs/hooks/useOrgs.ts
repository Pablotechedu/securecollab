import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { Organization } from '../../../types'

export function useOrgs() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<{ organizations: Organization[] }>('/orgs')
      .then(({ data }) => {
        if (!cancelled) setOrgs(data.organizations)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function createOrg(name: string, description?: string) {
    const { data } = await api.post<Organization>('/orgs', { name, description })
    setOrgs((prev) => [...prev, data])
    return data
  }

  return { orgs, loading, error, createOrg }
}
