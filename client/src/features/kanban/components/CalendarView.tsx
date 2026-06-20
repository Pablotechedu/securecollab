import { useState } from 'react'
import DOMPurify from 'dompurify'
import type { Task } from '../../../types'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PRIORITY_CHIP: Record<string, string> = {
  critical: 'bg-red-100 dark:bg-red-900/60 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
  high: 'bg-orange-100 dark:bg-orange-900/60 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200',
  medium: 'bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
  low: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface CalendarCell {
  day: number
  isCurrentMonth: boolean
  date: Date
}

interface Props {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

export default function CalendarView({ tasks, onTaskClick }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  // Build the grid: always 6 rows × 7 cols = 42 cells
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: CalendarCell[] = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    cells.push({ day: d, isCurrentMonth: false, date: new Date(year, month - 1, d) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) })
  }
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({ day: nextDay, isCurrentMonth: false, date: new Date(year, month + 1, nextDay) })
    nextDay++
  }

  // Index tasks by date key
  const tasksByDate = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.dueDate) continue
    const key = task.dueDate.slice(0, 10)
    const bucket = tasksByDate.get(key) ?? []
    bucket.push(task)
    tasksByDate.set(key, bucket)
  }

  const todayKey = toDateKey(today)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-6 px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-white px-2 py-1"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 w-40 text-center">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-white px-2 py-1"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7" style={{ minHeight: '100%' }}>
          {cells.map((cell, i) => {
            const key = toDateKey(cell.date)
            const dayTasks = tasksByDate.get(key) ?? []
            const isToday = key === todayKey

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-gray-100 dark:border-gray-700/50 p-1.5 ${
                  cell.isCurrentMonth
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-gray-50/70 dark:bg-gray-900/50'
                }`}
              >
                {/* Day number */}
                <div
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isToday
                      ? 'bg-indigo-600 text-white'
                      : cell.isCurrentMonth
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {cell.day}
                </div>

                {/* Task chips */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task._id}
                      onClick={() => onTaskClick(task)}
                      title={task.title}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded border truncate leading-snug ${
                        PRIORITY_CHIP[task.priority] ?? PRIORITY_CHIP.low
                      }`}
                    >
                      {task.sensitive ? '🔒 ' : ''}
                      {DOMPurify.sanitize(task.title, {
                        ALLOWED_TAGS: [],
                        ALLOWED_ATTR: [],
                      })}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
