import { useState } from 'react'
import { useAuditLog } from '../hooks/useAuditLog'

const ACTION_LABELS: Record<string, string> = {
  'task.create': 'Created',
  'task.update': 'Updated',
  'task.delete': 'Deleted',
  'task.status_change': 'Status changed',
  'security.unauthorized': 'Unauthorized attempt',
}

interface Props {
  taskId: string
}

export default function AuditLogPanel({ taskId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { logs, loading } = useAuditLog(taskId)

  return (
    <div className="border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        aria-expanded={expanded}
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
        Activity log
        {!loading && logs.length > 0 && (
          <span className="ml-1 bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs font-normal">
            {logs.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 max-h-52 overflow-y-auto space-y-2" aria-live="polite">
          {loading ? (
            <p className="text-xs text-gray-400 italic">Loading…</p>
          ) : logs.length === 0 ? (
            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                  clipRule="evenodd"
                />
              </svg>
              No audit entries yet
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log._id}
                className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0"
              >
                <time
                  className="text-gray-400 whitespace-nowrap pt-0.5 shrink-0"
                  dateTime={log.timestamp}
                >
                  {new Date(log.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${
                      log.action.startsWith('security.')
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}
                  >
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  {!!log.metadata?.status && (
                    <span className="text-gray-500">
                      → <strong>{String(log.metadata.status).replace('_', ' ')}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
