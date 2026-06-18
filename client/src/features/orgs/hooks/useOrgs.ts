import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { Organization } from '../../../types'

export function useOrgs() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
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

  async function updateOrg(id: string, name: string, description?: string) {
    const { data } = await api.put<Organization>(`/orgs/${id}`, { name, description })
    setOrgs((prev) => prev.map((o) => (o._id === id ? data : o)))
    return data
  }

  async function deleteOrg(id: string) {
    await api.delete(`/orgs/${id}`)
    setOrgs((prev) => prev.filter((o) => o._id !== id))
  }

  return { orgs, loading, error, createOrg, updateOrg, deleteOrg }
}
