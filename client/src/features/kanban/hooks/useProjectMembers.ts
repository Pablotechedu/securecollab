import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { MemberWithUser } from '../../../types'

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    api
      .get<{ members: MemberWithUser[] }>(`/projects/${projectId}/members`)
      .then(({ data }) => {
        if (!cancelled) setMembers(data.members)
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
  }, [projectId])

  return { members, loading, error }
}
