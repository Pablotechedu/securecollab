import type { TaskStatus } from '../../../types'

const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

interface Props {
  statuses: TaskStatus[]
  visible: Record<TaskStatus, boolean>
  onChange: (visible: Record<TaskStatus, boolean>) => void
  onClose: () => void
}

export default function ColumnConfigModal({ statuses, visible, onChange, onClose }: Props) {
  function toggle(status: TaskStatus) {
    const next = { ...visible, [status]: !visible[status] }
    if (Object.values(next).every((v) => !v)) return
    onChange(next)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configure column visibility"
        className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-52"
      >
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
          Column visibility
        </p>
        <div className="space-y-2">
          {statuses.map((status) => (
            <label key={status} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visible[status]}
                onChange={() => toggle(status)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {COLUMN_LABELS[status]}
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  )
}
