import { Draggable } from '@hello-pangea/dnd'
import DOMPurify from 'dompurify'
import type { Task, TaskPriority } from '../../../types'

interface Props {
  task: Task
  index: number
  onClick: (task: Task) => void
  isViewer: boolean
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export default function TaskCard({ task, index, onClick, isViewer }: Props) {
  return (
    <Draggable
      draggableId={task._id}
      index={index}
      isDragDisabled={isViewer}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onClick(task)}
          aria-label={`Task: ${task.title}`}
          className={`bg-white rounded-lg border border-gray-200 p-3 mb-2 cursor-pointer select-none transition-shadow ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-300' : 'hover:shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-medium text-gray-900 flex-1"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(task.title),
              }}
            />
            <div className="flex items-center gap-1 shrink-0">
              {task.sensitive && (
                <span
                  title="Sensitive task"
                  aria-label="Sensitive task"
                  className="text-amber-500"
                >
                  🔒
                </span>
              )}
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}
              >
                {task.priority}
              </span>
            </div>
          </div>

          {task.dueDate && (
            <p className="mt-1 text-xs text-gray-400">
              Due {new Date(task.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </Draggable>
  )
}
