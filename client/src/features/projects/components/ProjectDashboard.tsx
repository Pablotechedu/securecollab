import type { Task } from '../../../types'

interface Props {
  tasks: Task[]
}

export default function ProjectDashboard({ tasks }: Props) {
  const now = new Date()

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const overdue = tasks.filter(
    (t) => t.dueDate != null && new Date(t.dueDate) < now && t.status !== 'done',
  ).length

  const stats = [
    {
      label: 'Total',
      value: total,
      color: 'text-gray-700 dark:text-gray-200',
      bg: 'bg-gray-100 dark:bg-gray-700/60',
    },
    {
      label: 'Done',
      value: done,
      color: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-900/40',
    },
    {
      label: 'In Progress',
      value: inProgress,
      color: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-900/40',
    },
    {
      label: 'Overdue',
      value: overdue,
      color: overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500',
      bg: overdue > 0 ? 'bg-red-50 dark:bg-red-900/40' : 'bg-gray-50 dark:bg-gray-700/30',
    },
  ]

  return (
    <div className="flex gap-2 px-6 py-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 ${stat.bg}`}
        >
          <span className={`text-lg font-bold leading-none ${stat.color}`}>{stat.value}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
