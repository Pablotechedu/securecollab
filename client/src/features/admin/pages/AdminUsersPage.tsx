import { useState } from 'react'
import Layout from '../../../components/Layout'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorMessage from '../../../components/ErrorMessage'
import useAuthStore from '../../../store/authStore'
import { useAdminUsers } from '../hooks/useAdminUsers'

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  user: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  user: 'User',
}

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const { users, total, loading, error, deactivateUser, loadMore, hasMore } = useAdminUsers()
  const [actionError, setActionError] = useState<unknown>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? This cannot be undone from the UI.`)) return
    setActionError(null)
    setDeactivating(id)
    try {
      await deactivateUser(id)
    } catch (err) {
      setActionError(err)
    } finally {
      setDeactivating(null)
    }
  }

  function canDeactivate(userId: string, role: string) {
    if (userId === currentUser?._id) return false
    if (role === 'super_admin') return false
    return true
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">{total} total users</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ring-purple-200">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-4V3a1 1 0 00-1-1zm0 4a2 2 0 110 4 2 2 0 010-4z" clipRule="evenodd" />
            </svg>
            Admin Panel
          </span>
        </div>

        {actionError != null && (
          <div className="mb-4">
            <ErrorMessage error={actionError} />
          </div>
        )}

        {loading && users.length === 0 && <LoadingSpinner label="Loading users" />}
        {error != null && <ErrorMessage error={error} />}

        {users.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      className={`hover:bg-gray-50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          {u.name}
                          {u._id === currentUser?._id && (
                            <span className="text-xs text-gray-400">(you)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLES[u.role] ?? ROLE_STYLES.user}`}
                        >
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.isActive && (
                          <button
                            onClick={() => void handleDeactivate(u._id, u.name)}
                            disabled={!canDeactivate(u._id, u.role) || deactivating === u._id}
                            title={
                              u._id === currentUser?._id
                                ? 'Cannot deactivate yourself'
                                : u.role === 'super_admin'
                                  ? 'Cannot deactivate a super admin'
                                  : 'Deactivate user'
                            }
                            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {deactivating === u._id ? 'Deactivating…' : 'Deactivate'}
                          </button>
                        )}
                      </td>
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
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
