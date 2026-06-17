import { useState, type FormEvent } from 'react'
import ErrorMessage from '../../../components/ErrorMessage'
import type { MemberWithUser } from '../../../types'
import api from '../../../services/api'

const ROLE_LABELS: Record<string, string> = {
  project_admin: 'Admin',
  developer: 'Developer',
  viewer: 'Viewer',
}

function RoleBadge({ role }: { role: string }) {
  const colors =
    role === 'project_admin'
      ? 'bg-indigo-100 text-indigo-700'
      : role === 'developer'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  projectId: string
  members: MemberWithUser[]
  isAdmin: boolean
  onMemberAdded: () => void
}

export default function ProjectMembersPanel({
  projectId,
  members,
  isAdmin,
  onMemberAdded,
}: Props) {
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'project_admin' | 'developer' | 'viewer'>('developer')
  const [addError, setAddError] = useState<unknown>(null)
  const [adding, setAdding] = useState(false)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    try {
      await api.post(`/projects/${projectId}/members`, { userId: userId.trim(), role })
      setUserId('')
      setShowAdd(false)
      onMemberAdded()
    } catch (err) {
      setAddError(err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors"
      >
        <svg
          className="h-4 w-4 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
        </svg>
        Members
        <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs leading-none">
          {members.length}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-72">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Project members
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add
              </button>
            )}
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} className="px-4 py-3 border-b border-gray-100 space-y-2">
              <input
                type="text"
                required
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'project_admin' | 'developer' | 'viewer')
                }
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
                <option value="project_admin">Admin</option>
              </select>
              {addError != null && (
                <div className="text-xs">
                  <ErrorMessage error={addError} />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddError(null) }}
                  className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 text-xs bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          )}

          <ul className="py-1 max-h-56 overflow-y-auto" role="list">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0"
                >
                  {initials(m.name || '?')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                <RoleBadge role={m.role} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
