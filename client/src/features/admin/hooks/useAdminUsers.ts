import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { User } from '../../../types'

const PAGE_SIZE = 50

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [skip, setSkip] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ users: User[]; total: number }>('/admin/users', {
        params: { skip, limit: PAGE_SIZE },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setUsers((prev) => (skip === 0 ? data.users : [...prev, ...data.users]))
          setTotal(data.total)
        }
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
  }, [skip])

  async function deactivateUser(id: string) {
    await api.patch(`/admin/users/${id}/deactivate`)
    setUsers((prev) =>
      prev.map((u) => (u._id === id ? { ...u, isActive: false } : u)),
    )
  }

  function loadMore() {
    setLoading(true)
    setSkip((prev) => prev + PAGE_SIZE)
  }

  const hasMore = users.length < total

  return { users, total, loading, error, deactivateUser, loadMore, hasMore }
}
