import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { AuditLogEntry } from '../../../types'

export function useAuditLog(taskId: string) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    api
      .get<{ logs: AuditLogEntry[] }>(`/tasks/${taskId}/audit-logs`)
      .then(({ data }) => {
        if (!cancelled) setLogs(data.logs)
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
  }, [taskId])

  return { logs, loading, error }
}
