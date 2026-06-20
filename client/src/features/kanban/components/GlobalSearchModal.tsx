import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import type { Task } from '../../../types'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

interface Props {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onClose: () => void
}

export default function GlobalSearchModal({ tasks, onTaskClick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results =
    query.length < 2
      ? []
      : tasks
          .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tasks"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-400 mr-2 shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks…"
            className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">
            Esc
          </kbd>
        </div>

        {query.length < 2 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            Type at least 2 characters to search
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            No tasks found
          </p>
        ) : (
          <ul>
            {results.map((task) => (
              <li key={task._id}>
                <button
                  onClick={() => {
                    onTaskClick(task)
                    onClose()
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  {task.sensitive && (
                    <span className="text-amber-500 text-xs shrink-0">🔒</span>
                  )}
                  <span
                    className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(task.title, {
                        ALLOWED_TAGS: [],
                        ALLOWED_ATTR: [],
                      }),
                    }}
                  />
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {STATUS_LABELS[task.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
