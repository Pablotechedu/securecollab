import { Droppable } from '@hello-pangea/dnd'
import TaskCard from './TaskCard'
import type { Task, TaskStatus } from '../../../types'

interface Props {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  isViewer: boolean
}

const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
}

export default function Column({ status, tasks, onTaskClick, isViewer }: Props) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${COLUMN_HEADER_COLORS[status]}`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          {COLUMN_LABELS[status]}
        </span>
        <span className="text-xs font-medium">{tasks.length}</span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-24 p-2 rounded-b-lg border border-t-0 border-gray-200 transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-50' : 'bg-gray-50'
            }`}
          >
            {tasks.map((task, i) => (
              <TaskCard
                key={task._id}
                task={task}
                index={i}
                onClick={onTaskClick}
                isViewer={isViewer}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
