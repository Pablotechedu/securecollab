import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { Project } from '../../../types'

export function useProjects(orgId: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setLoading(true)
    api
      .get<{ projects: Project[] }>(`/orgs/${orgId}/projects`)
      .then(({ data }) => {
        if (!cancelled) setProjects(data.projects)
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
  }, [orgId])

  async function createProject(
    name: string,
    description?: string,
    visibility: 'private' | 'internal' = 'internal',
  ) {
    const { data } = await api.post<Project>(`/orgs/${orgId}/projects`, {
      name,
      description,
      visibility,
    })
    setProjects((prev) => [...prev, data])
    return data
  }

  return { projects, loading, error, createProject }
}
