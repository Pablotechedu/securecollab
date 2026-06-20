import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import Column from './Column'
import TaskDetail from './TaskDetail'
import CreateTaskModal from './CreateTaskModal'
import CalendarView from './CalendarView'
import ColumnConfigModal from './ColumnConfigModal'
import GlobalSearchModal from './GlobalSearchModal'
import ProjectDashboard from '../../projects/components/ProjectDashboard'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorMessage from '../../../components/ErrorMessage'
import ProjectMembersPanel from '../../projects/components/ProjectMembersPanel'
import { useTasks } from '../hooks/useTasks'
import { useTaskActions } from '../hooks/useTaskActions'
import { useProjectMembers } from '../hooks/useProjectMembers'
import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'
import type { Task, TaskStatus, Project, TaskPriority } from '../../../types'

interface Props {
  projectId: string
}

type ViewMode = 'board' | 'calendar'

export default function Board({ projectId }: Props) {
  const { tasks, columns, statuses, loading, error, reload } = useTasks(projectId)
  const { createTask, moveTask, updateTask, deleteTask } = useTaskActions(
    projectId,
    reload,
  )
  const { members } = useProjectMembers(projectId)
  const currentUser = useAuthStore((s) => s.user)
  const [project, setProject] = useState<Project | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // View mode: board or calendar
  const [viewMode, setViewMode] = useState<ViewMode>('board')

  // Column visibility — persisted to localStorage
  const [visibleColumns, setVisibleColumns] = useState<Record<TaskStatus, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sc_column_config')
      if (saved) return JSON.parse(saved) as Record<TaskStatus, boolean>
    } catch { /* ignore corrupted localStorage value */ }
    return { backlog: true, in_progress: true, review: true, done: true }
  })
  const [showColumnConfig, setShowColumnConfig] = useState(false)

  // Global search
  const [showSearch, setShowSearch] = useState(false)

  // Filter state
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')

  const hasFilters = filterAssigneeId !== '' || filterPriority !== ''

  // ⌘K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredColumns = useMemo(() => {
    if (!hasFilters) return columns
    const filtered: typeof columns = {} as typeof columns
    for (const status of statuses) {
      filtered[status] = columns[status].filter((task) => {
        if (filterAssigneeId) {
          if (filterAssigneeId === '__unassigned__') {
            if (task.assigneeId != null) return false
          } else if (task.assigneeId !== filterAssigneeId) {
            return false
          }
        }
        if (filterPriority && task.priority !== (filterPriority as TaskPriority)) return false
        return true
      })
    }
    return filtered
  }, [columns, statuses, filterAssigneeId, filterPriority, hasFilters])

  useEffect(() => {
    if (!projectId) return
    api
      .get<Project>(`/projects/${projectId}`)
      .then(({ data }) => setProject(data))
      .catch(() => {})
  }, [projectId])

  const userRole = currentUser && project
    ? project.members.find((m) => m.userId === currentUser._id)?.role
    : undefined

  const isViewer = userRole === 'viewer'

  function handleColumnConfigChange(visible: Record<TaskStatus, boolean>) {
    setVisibleColumns(visible)
    localStorage.setItem('sc_column_config', JSON.stringify(visible))
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || isViewer) return
    const newStatus = result.destination.droppableId as TaskStatus
    const oldStatus = result.source.droppableId as TaskStatus
    if (newStatus === oldStatus && result.source.index === result.destination.index) return

    const taskId = result.draggableId
    try {
      await moveTask(taskId, newStatus)
    } catch {
      reload()
    }
  }

  if (loading) return <LoadingSpinner label="Loading kanban board" />
  if (error) return <div className="p-6"><ErrorMessage error={error} /></div>

  return (
    <div className="flex flex-col h-full">
      {/* Main toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {project?.name ?? 'Kanban Board'}
            {project?.status === 'archived' && (
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                Archived
              </span>
            )}
          </h2>
          {userRole && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                userRole === 'project_admin'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : userRole === 'developer'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {userRole === 'project_admin'
                ? 'Admin'
                : userRole === 'developer'
                ? 'Developer'
                : 'Viewer (read-only)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Board / Calendar toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`text-xs px-2.5 py-1.5 transition-colors ${
                viewMode === 'board'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`text-xs px-2.5 py-1.5 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Calendar
            </button>
          </div>

          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            title="Search tasks (⌘K)"
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span>🔍</span>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-500">⌘K</span>
          </button>

          {/* Column config (board mode only) */}
          {viewMode === 'board' && (
            <div className="relative">
              <button
                onClick={() => setShowColumnConfig((prev) => !prev)}
                title="Configure columns"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                ⚙
              </button>
              {showColumnConfig && (
                <ColumnConfigModal
                  statuses={statuses}
                  visible={visibleColumns}
                  onChange={handleColumnConfigChange}
                  onClose={() => setShowColumnConfig(false)}
                />
              )}
            </div>
          )}

          <ProjectMembersPanel
            projectId={projectId}
            members={members}
            isAdmin={userRole === 'project_admin'}
            onMemberAdded={reload}
          />

          {!isViewer && project?.status === 'active' && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <ProjectDashboard tasks={tasks} />

      {/* Filter toolbar (board mode only) */}
      {viewMode === 'board' && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-wrap">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter:</span>

          <select
            value={filterAssigneeId}
            onChange={(e) => setFilterAssigneeId(e.target.value)}
            aria-label="Filter by assignee"
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          >
            <option value="">All assignees</option>
            <option value="__unassigned__">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            aria-label="Filter by priority"
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setFilterAssigneeId(''); setFilterPriority('') }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content area */}
      {viewMode === 'calendar' ? (
        <CalendarView tasks={tasks} onTaskClick={setSelectedTask} />
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {statuses.filter((s) => visibleColumns[s]).map((status) => (
                <Column
                  key={status}
                  status={status}
                  tasks={filteredColumns[status]}
                  onTaskClick={setSelectedTask}
                  isViewer={isViewer}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Task detail slide-over */}
      {selectedTask && project && (
        <TaskDetail
          task={selectedTask}
          project={project}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (taskId, payload) => {
            await updateTask(taskId, payload)
            setSelectedTask((prev) =>
              prev ? { ...prev, ...payload } : null,
            )
          }}
          onDelete={async (taskId) => {
            await deleteTask(taskId)
            setSelectedTask(null)
          }}
          onStatusChange={async (taskId, status) => {
            await moveTask(taskId, status)
            setSelectedTask((prev) =>
              prev ? { ...prev, status } : null,
            )
          }}
        />
      )}

      {/* Create task modal */}
      {showCreate && (
        <CreateTaskModal
          members={members}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            await createTask(payload)
          }}
        />
      )}

      {/* Global search modal */}
      {showSearch && (
        <GlobalSearchModal
          tasks={tasks}
          onTaskClick={(task) => {
            setSelectedTask(task)
            setShowSearch(false)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
