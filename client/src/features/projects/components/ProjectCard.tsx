import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import useAuthStore from '../../../store/authStore'
import EditProjectModal from './EditProjectModal'
import type { Project } from '../../../types'

interface Props {
  project: Project
  orgId: string
  onUpdate?: (fields: Partial<Pick<Project, 'name' | 'description' | 'visibility' | 'status'>>) => Promise<unknown>
  onDelete?: () => Promise<unknown>
  onArchive?: (archive: boolean) => Promise<unknown>
}

const STATUS_COLORS: Record<Project['status'], string> = {
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

const VISIBILITY_LABELS: Record<Project['visibility'], string> = {
  private: 'Private',
  internal: 'Internal',
}

export default function ProjectCard({ project, orgId, onUpdate, onDelete, onArchive }: Props) {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const myRole = project.members.find((m) => m.userId === currentUser?._id)?.role
  const canManage = myRole === 'project_admin' && (onUpdate != null || onDelete != null)

  function handleCardClick() {
    if (project.status !== 'archived') {
      navigate(`/orgs/${orgId}/projects/${project._id}`)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') handleCardClick()
  }

  async function handleArchiveToggle() {
    setMenuOpen(false)
    if (onArchive) await onArchive(project.status === 'active')
  }

  async function handleSave(fields: Partial<Pick<Project, 'name' | 'description' | 'visibility' | 'status'>>) {
    if (onUpdate) await onUpdate(fields)
  }

  async function handleDelete() {
    if (onDelete) await onDelete()
  }

  return (
    <div className="relative group">
      {/* Main clickable card */}
      <div
        role="button"
        tabIndex={project.status === 'archived' ? -1 : 0}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        aria-label={`Open project ${project.name}`}
        aria-disabled={project.status === 'archived'}
        className={`w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-5 transition-all ${
          project.status === 'archived'
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:shadow-md hover:border-indigo-300 cursor-pointer'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-semibold text-gray-900 text-base pr-6">{project.name}</h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[project.status]}`}
          >
            {project.status === 'archived' ? 'Archived' : VISIBILITY_LABELS[project.visibility]}
          </span>
        </div>
        {project.description && (
          <p
            className="text-sm text-gray-500 line-clamp-2 mt-1"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(project.description),
            }}
          />
        )}
        <p className="mt-2 text-xs text-gray-400">
          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Kebab menu — only for project_admin */}
      {canManage && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            aria-label="Project options"
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              <button
                onMouseDown={() => { setMenuOpen(false); setShowEdit(true) }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              {onArchive && (
                <button
                  onMouseDown={() => void handleArchiveToggle()}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
