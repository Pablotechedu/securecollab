import Layout from '../../../components/Layout'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorMessage from '../../../components/ErrorMessage'
import { useAdminAuditLogs } from '../hooks/useAdminAuditLogs'

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'auth.login', label: 'auth.login' },
  { value: 'auth.logout', label: 'auth.logout' },
  { value: 'auth.register', label: 'auth.register' },
  { value: 'auth.refresh', label: 'auth.refresh' },
  { value: 'task.created', label: 'task.created' },
  { value: 'task.updated', label: 'task.updated' },
  { value: 'task.deleted', label: 'task.deleted' },
  { value: 'task.status_changed', label: 'task.status_changed' },
  { value: 'org.member.added', label: 'org.member.added' },
  { value: 'org.member.removed', label: 'org.member.removed' },
  { value: 'security.unauthorized', label: 'security.unauthorized' },
  { value: 'security.rate_limited', label: 'security.rate_limited' },
]

const ACTION_COLORS: Record<string, string> = {
  'auth.login': 'bg-blue-50 text-blue-700',
  'auth.logout': 'bg-slate-100 text-slate-600',
  'auth.register': 'bg-green-50 text-green-700',
  'auth.refresh': 'bg-sky-50 text-sky-600',
  'task.created': 'bg-emerald-50 text-emerald-700',
  'task.updated': 'bg-yellow-50 text-yellow-700',
  'task.deleted': 'bg-red-50 text-red-700',
  'task.status_changed': 'bg-orange-50 text-orange-700',
  'org.member.added': 'bg-indigo-50 text-indigo-700',
  'org.member.removed': 'bg-rose-50 text-rose-700',
  'security.unauthorized': 'bg-red-100 text-red-800',
  'security.rate_limited': 'bg-amber-100 text-amber-800',
}

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600'
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AdminAuditLogsPage() {
  const { logs, total, loading, error, loadMore, hasMore, changeFilter, actionFilter } = useAdminAuditLogs()

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">{total} entries</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="action-filter" className="text-sm text-gray-600 whitespace-nowrap">
              Filter by action:
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => changeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && logs.length === 0 && <LoadingSpinner label="Loading audit logs" />}
        {error != null && <ErrorMessage error={error} />}

        {logs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                    <th className="px-4 py-3 text-left font-semibold">Actor</th>
                    <th className="px-4 py-3 text-left font-semibold">Resource</th>
                    <th className="px-4 py-3 text-left font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-mono">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatTs(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${actionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[140px] truncate">
                        {log.actorId ?? <span className="text-gray-400 italic">system</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {log.resourceType && (
                          <span>
                            <span className="font-semibold text-gray-700">{log.resourceType}</span>
                            {log.resourceId && (
                              <span className="text-gray-400"> · {log.resourceId}</span>
                            )}
                          </span>
                        )}
                        {!log.resourceType && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading…' : `Load more (${total - logs.length} remaining)`}
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            No audit log entries found{actionFilter ? ` for action “${actionFilter}”` : ''}.
          </p>
        )}
      </div>
    </Layout>
  )
}
