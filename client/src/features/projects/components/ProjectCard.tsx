import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import type { Project } from '../../../types'

interface Props {
  project: Project
  orgId: string
}

const VISIBILITY_LABELS: Record<Project['visibility'], string> = {
  private: 'Private',
  internal: 'Internal',
}

const STATUS_COLORS: Record<Project['status'], string> = {
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

export default function ProjectCard({ project, orgId }: Props) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/orgs/${orgId}/projects/${project._id}`)}
      disabled={project.status === 'archived'}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label={`Open project ${project.name}`}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900 text-base">{project.name}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}
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
    </button>
  )
}
