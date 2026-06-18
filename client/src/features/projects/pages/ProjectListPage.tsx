import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../../../components/Layout'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorMessage from '../../../components/ErrorMessage'
import ProjectCard from '../components/ProjectCard'
import CreateProjectModal from '../components/CreateProjectModal'
import { useProjects } from '../hooks/useProjects'

export default function ProjectListPage() {
  const { orgId = '' } = useParams<{ orgId: string }>()
  const { projects, loading, error, createProject, updateProject, archiveProject, deleteProject } = useProjects(orgId)
  const [showModal, setShowModal] = useState(false)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            + New Project
          </button>
        </div>

        {loading && <LoadingSpinner label="Loading projects" />}
        {error != null && <ErrorMessage error={error} />}

        {!loading && !error && projects.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            No projects yet. Create one above.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              orgId={orgId}
              onUpdate={(fields) => updateProject(project._id, fields)}
              onDelete={() => deleteProject(project._id)}
              onArchive={(archive) => archiveProject(project._id, archive)}
            />
          ))}
        </div>
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={async (name, description, visibility) => {
            await createProject(name, description, visibility)
          }}
        />
      )}
    </Layout>
  )
}
