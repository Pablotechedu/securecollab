import { useState, type FormEvent } from 'react'
import DOMPurify from 'dompurify'
import ErrorMessage from '../../../components/ErrorMessage'
import type { Project } from '../../../types'

interface Props {
  project: Project
  onClose: () => void
  onSave: (
    fields: Partial<Pick<Project, 'name' | 'description' | 'visibility' | 'status'>>,
  ) => Promise<unknown>
  onDelete: () => Promise<unknown>
}

export default function EditProjectModal({ project, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [visibility, setVisibility] = useState<'private' | 'internal'>(project.visibility)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSave({
        name: DOMPurify.sanitize(name),
        description: DOMPurify.sanitize(description),
        visibility,
      })
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}"? All tasks will be lost.`)) return
    setError(null)
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err)
      setDeleting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 id="edit-project-title" className="text-lg font-semibold text-gray-900 mb-4">
          Edit Project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="proj-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="proj-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="proj-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="proj-description"
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="proj-visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              id="proj-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'internal')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="internal">Internal (all org members)</option>
              <option value="private">Private (project members only)</option>
            </select>
          </div>

          {error != null && <ErrorMessage error={error} />}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting || loading}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-40 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete project'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || deleting}
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
