import { useState } from 'react'
import DOMPurify from 'dompurify'
import { sanitizeText } from '../../../utils/sanitize'
import CommentsPanel from '../../comments/components/CommentsPanel'
import AuditLogPanel from './AuditLogPanel'
import AssigneePicker from './AssigneePicker'
import ErrorMessage from '../../../components/ErrorMessage'
import useAuthStore from '../../../store/authStore'
import type { Task, TaskPriority, TaskStatus, Project, MemberWithUser } from '../../../types'

interface Props {
  task: Task
  project: Project
  members: MemberWithUser[]
  onClose: () => void
  onUpdate: (taskId: string, payload: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>
}

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'critical']
const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']

export default function TaskDetail({
  task,
  project,
  members,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
}: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const [error, setError] = useState<unknown>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description ?? '')
  const [editSensitive, setEditSensitive] = useState(task.sensitive)
  const [saveLoading, setSaveLoading] = useState(false)

  const userProjectRole = currentUser
    ? project.members.find((m) => m.userId === currentUser._id)?.role
    : undefined

  const isProjectAdmin = userProjectRole === 'project_admin'
  const isAssignee = currentUser && task.assigneeId === currentUser._id
  const isViewer = userProjectRole === 'viewer'

  const canSeeDescription =
    !task.sensitive || isProjectAdmin || isAssignee || task.reporterId === currentUser?._id
  const canEdit = !isViewer && project.status === 'active'
  const canDelete = isProjectAdmin
  const canComment = !isViewer && project.status === 'active'

  async function handlePriorityChange(priority: TaskPriority) {
    if (!canEdit) return
    setError(null)
    try {
      await onUpdate(task._id, { priority })
    } catch (err) {
      setError(err)
    }
  }

  async function handleStatusChange(status: TaskStatus) {
    if (!canEdit) return
    setError(null)
    try {
      await onStatusChange(task._id, status)
    } catch (err) {
      setError(err)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setError(null)
    try {
      await onDelete(task._id)
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  function startEditing() {
    setEditTitle(task.title)
    setEditDescription(task.description ?? '')
    setEditSensitive(task.sensitive)
    setEditing(true)
  }

  async function handleSaveEdit() {
    setError(null)
    setSaveLoading(true)
    try {
      await onUpdate(task._id, {
        title: sanitizeText(editTitle),
        description: editDescription ? sanitizeText(editDescription) : undefined,
        sensitive: editSensitive,
      })
      setEditing(false)
    } catch (err) {
      setError(err)
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {(editing ? editSensitive : task.sensitive) && (
              <span
                title="Sensitive task — description may be restricted"
                aria-label="Sensitive task"
                className="text-amber-500 text-lg shrink-0"
              >
                🔒
              </span>
            )}
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Task title"
              />
            ) : (
              <h2
                id="task-detail-title"
                className="text-base font-semibold text-gray-900 line-clamp-1"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.title) }}
              />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {canEdit && !editing && (
              <button
                onClick={startEditing}
                className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close task detail"
              className="text-gray-400 hover:text-gray-600 text-xl font-medium"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as TaskStatus)
                }
                disabled={!canEdit}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) =>
                  handlePriorityChange(e.target.value as TaskPriority)
                }
                disabled={!canEdit}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {task.dueDate && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Due date
                </label>
                <p className="text-sm text-gray-700">
                  {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Assignee
              </label>
              <AssigneePicker
                members={members}
                assigneeId={task.assigneeId}
                disabled={!canEdit}
                onChange={(userId) => {
                  if (!canEdit) return
                  setError(null)
                  onUpdate(task._id, { assigneeId: userId }).catch(setError)
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
              {(editing ? editSensitive : task.sensitive) && (
                <span className="ml-1 text-amber-600">(sensitive)</span>
              )}
            </label>
            {editing && canSeeDescription ? (
              <div className="space-y-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  aria-label="Task description"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSensitive}
                    onChange={(e) => setEditSensitive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    🔒 Mark as sensitive (encrypts description)
                  </span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saveLoading || !editTitle.trim()}
                    className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : canSeeDescription ? (
              task.description ? (
                <div
                  className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(task.description),
                  }}
                />
              ) : (
                <p className="text-sm text-gray-400 italic">No description.</p>
              )
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <span className="text-amber-500">🔒</span>
                <p className="text-sm text-amber-700">
                  Description hidden — this is a sensitive task. Only the
                  assignee and project admin can view it.
                </p>
              </div>
            )}
          </div>

          {error != null && <ErrorMessage error={error} />}

          {/* Delete */}
          {canDelete && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleDelete}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  deleteConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'text-red-500 hover:bg-red-50'
                }`}
              >
                {deleteConfirm ? 'Confirm delete?' : 'Delete task'}
              </button>
            </div>
          )}

          {/* Audit log */}
          <AuditLogPanel taskId={task._id} />

          {/* Comments */}
          <CommentsPanel taskId={task._id} canComment={canComment} />
        </div>
      </div>
    </>
  )
}
