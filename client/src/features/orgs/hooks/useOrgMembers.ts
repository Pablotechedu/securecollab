import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api'
import type { MemberWithUser } from '../../../types'

export function useOrgMembers(orgId: string) {
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const fetchMembers = useCallback(() => {
    if (!orgId) return
    api
      .get<{ members: MemberWithUser[] }>(`/orgs/${orgId}/members`)
      .then(({ data }) => setMembers(data.members))
      .catch(setError)
      .finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function addMember(userId: string, role: 'org_admin' | 'member') {
    await api.post(`/orgs/${orgId}/members`, { userId, role })
    fetchMembers()
  }

  async function removeMember(userId: string) {
    await api.delete(`/orgs/${orgId}/members/${userId}`)
    fetchMembers()
  }

  return { members, loading, error, addMember, removeMember, reload: fetchMembers }
}
