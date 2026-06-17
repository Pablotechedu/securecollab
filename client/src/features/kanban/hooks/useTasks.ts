import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { Task, TaskStatus } from '../../../types'

export type TaskColumns = Record<TaskStatus, Task[]>

const STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']

function groupByStatus(tasks: Task[]): TaskColumns {
  const cols: TaskColumns = {
    backlog: [],
    in_progress: [],
    review: [],
    done: [],
  }
  for (const task of tasks) {
    cols[task.status].push(task)
  }
  return cols
}

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  function reload() {
    setLoading(true)
    api
      .get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`)
      .then(({ data }) => setTasks(data.tasks))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!projectId) return
    reload()
  }, [projectId])

  const columns = groupByStatus(tasks)

  return { tasks, columns, statuses: STATUSES, loading, error, reload, setTasks }
}
