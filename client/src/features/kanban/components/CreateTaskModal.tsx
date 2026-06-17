import { useState, type FormEvent } from 'react'
import ErrorMessage from '../../../components/ErrorMessage'
import AssigneePicker from './AssigneePicker'
import { sanitizeText } from '../../../utils/sanitize'
import type { TaskPriority, MemberWithUser } from '../../../types'

interface Props {
  members: MemberWithUser[]
  onClose: () => void
  onCreate: (payload: {
    title: string
    description?: string
    priority: TaskPriority
    sensitive: boolean
    dueDate?: string
    assigneeId?: string | null
  }) => Promise<void>
}

export default function CreateTaskModal({ members, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [sensitive, setSensitive] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onCreate({
        title: sanitizeText(title),
        description: description ? sanitizeText(description) : undefined,
        priority,
        sensitive,
        dueDate: dueDate || undefined,
        assigneeId,
      })
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
      aria-labelledby="create-task-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2
          id="create-task-title"
          className="text-lg font-semibold text-gray-900 mb-4"
        >
          New Task
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignee
            </label>
            <AssigneePicker
              members={members}
              assigneeId={assigneeId}
              onChange={setAssigneeId}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sensitive}
              onChange={(e) => setSensitive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              🔒 Mark as sensitive (encrypts description)
            </span>
          </label>

          {error != null && <ErrorMessage error={error} />}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
