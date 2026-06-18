import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { AuditLogEntry } from '../../../types'

const PAGE_SIZE = 50

export function useAdminAuditLogs() {
  const [actionFilter, setActionFilter] = useState('')
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [skip, setSkip] = useState(0)

  useEffect(() => {
    let cancelled = false
    const params: Record<string, string | number> = { skip, limit: PAGE_SIZE }
    if (actionFilter) params.action = actionFilter
    api
      .get<{ logs: AuditLogEntry[]; total: number }>('/admin/audit-logs', { params })
      .then(({ data }) => {
        if (!cancelled) {
          setLogs((prev) => (skip === 0 ? data.logs : [...prev, ...data.logs]))
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
  }, [skip, actionFilter])

  function changeFilter(filter: string) {
    setLoading(true)
    setLogs([])
    setSkip(0)
    setActionFilter(filter)
  }

  function loadMore() {
    setLoading(true)
    setSkip((prev) => prev + PAGE_SIZE)
  }

  const hasMore = logs.length < total

  return { logs, total, loading, error, loadMore, hasMore, changeFilter, actionFilter }
}
