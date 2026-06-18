import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import InviteModal from '../components/InviteModal'
import EditOrgModal from '../components/EditOrgModal'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorMessage from '../../../components/ErrorMessage'
import { useOrgMembers } from '../hooks/useOrgMembers'
import useAuthStore from '../../../store/authStore'
import api from '../../../services/api'
import type { MemberWithUser, Organization } from '../../../types'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function RoleBadge({ role }: { role: MemberWithUser['role'] }) {
  if (role === 'org_admin') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Member
    </span>
  )
}

export default function OrgMembersPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const { members, loading, error, addMember, removeMember } = useOrgMembers(orgId!)
  const [showInvite, setShowInvite] = useState(false)
  const [showEditOrg, setShowEditOrg] = useState(false)
  const [removeError, setRemoveError] = useState<unknown>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<unknown>(null)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    api.get<Organization>(`/orgs/${orgId}`).then(({ data }) => {
      if (!cancelled) setOrg(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [orgId])

  const currentMember = members.find((m) => m.userId === currentUser?._id)
  const isAdmin = currentMember?.role === 'org_admin'

  async function handleRemove(userId: string) {
    setRemoveError(null)
    setRemovingId(userId)
    try {
      await removeMember(userId)
    } catch (err) {
      setRemoveError(err)
    } finally {
      setRemovingId(null)
    }
  }

  async function handleEditOrg(name: string, description: string) {
    const { data } = await api.put<Organization>(`/orgs/${orgId}`, { name, description })
    setOrg(data)
  }

  async function handleDeleteOrg() {
    if (!confirm('Delete this organization? This cannot be undone.')) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.delete(`/orgs/${orgId}`)
      navigate('/orgs')
    } catch (err) {
      setDeleteError(err)
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? '…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowEditOrg(true)}
                  className="text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Edit organization"
                >
                  Edit org
                </button>
                <button
                  onClick={() => void handleDeleteOrg()}
                  disabled={deleting}
                  className="text-sm text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Delete organization"
                >
                  {deleting ? 'Deleting…' : 'Delete org'}
                </button>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 018 18a9.953 9.953 0 01-5.385-1.572zM16.25 5.75a.75.75 0 00-1.5 0v2h-2a.75.75 0 000 1.5h2v2a.75.75 0 001.5 0v-2h2a.75.75 0 000-1.5h-2v-2z" />
                  </svg>
                  Invite member
                </button>
              </>
            )}
          </div>
        </div>

        {removeError != null && (
          <div className="mb-4">
            <ErrorMessage error={removeError} />
          </div>
        )}
        {deleteError != null && (
          <div className="mb-4">
            <ErrorMessage error={deleteError} />
          </div>
        )}

        {loading ? (
          <LoadingSpinner label="Loading team members" />
        ) : error != null ? (
          <ErrorMessage error={error} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3" aria-label="Actions" />
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.userId}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0"
                        >
                          {initials(m.name || '?')}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {m.name}
                            {m.userId === currentUser?._id && (
                              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 sm:hidden">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {m.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={m.role} />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {m.userId !== currentUser?._id && (
                          <button
                            onClick={() => handleRemove(m.userId)}
                            disabled={removingId === m.userId}
                            aria-label={`Remove ${m.name} from organization`}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                          >
                            {removingId === m.userId ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={addMember}
        />
      )}
      {showEditOrg && org && (
        <EditOrgModal
          org={org}
          onClose={() => setShowEditOrg(false)}
          onSave={handleEditOrg}
        />
      )}
    </Layout>
  )
}
