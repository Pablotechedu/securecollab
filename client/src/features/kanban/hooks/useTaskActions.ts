import api from '../../../services/api'
import type { Task, TaskStatus, TaskPriority } from '../../../types'

interface CreateTaskPayload {
  title: string
  description?: string
  assigneeId?: string | null
  priority?: TaskPriority
  sensitive?: boolean
  dueDate?: string
}

interface UpdateTaskPayload {
  title?: string
  description?: string
  assigneeId?: string | null
  priority?: TaskPriority
  sensitive?: boolean
  dueDate?: string | null
}

export function useTaskActions(
  projectId: string,
  onTasksChanged: () => void,
) {
  async function createTask(payload: CreateTaskPayload): Promise<Task> {
    const { data } = await api.post<Task>(
      `/projects/${projectId}/tasks`,
      payload,
    )
    onTasksChanged()
    return data
  }

  async function moveTask(taskId: string, status: TaskStatus): Promise<void> {
    await api.patch(`/tasks/${taskId}/status`, { status })
    onTasksChanged()
  }

  async function updateTask(
    taskId: string,
    payload: UpdateTaskPayload,
  ): Promise<Task> {
    const { data } = await api.put<Task>(`/tasks/${taskId}`, payload)
    onTasksChanged()
    return data
  }

  async function deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`)
    onTasksChanged()
  }

  return { createTask, moveTask, updateTask, deleteTask }
}
