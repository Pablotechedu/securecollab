import { useState, type FormEvent, useEffect, useRef } from 'react'
import ErrorMessage from '../../../components/ErrorMessage'

interface Props {
  onClose: () => void
  onInvite: (userId: string, role: 'org_admin' | 'member') => Promise<void>
}

export default function InviteModal({ onClose, onInvite }: Props) {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'org_admin' | 'member'>('member')
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onInvite(userId.trim(), role)
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2
            id="invite-modal-title"
            className="text-base font-semibold text-gray-900"
          >
            Invite member
          </h2>
          <button
            onClick={onClose}
            aria-label="Close invite modal"
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-user-id"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              User ID
            </label>
            <input
              ref={inputRef}
              id="invite-user-id"
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="MongoDB ObjectId of the user"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ask the user for their account ID from their profile.
            </p>
          </div>

          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'org_admin' | 'member')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Member</option>
              <option value="org_admin">Org Admin</option>
            </select>
          </div>

          {error != null && <ErrorMessage error={error} />}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !userId.trim()}
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
