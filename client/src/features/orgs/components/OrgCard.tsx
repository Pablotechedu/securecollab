import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import type { Organization } from '../../../types'

interface Props {
  org: Organization
}

export default function OrgCard({ org }: Props) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/orgs/${org._id}/projects`)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={`Open organization ${org.name}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
          {org.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="font-semibold text-gray-900 text-base">{org.name}</h2>
      </div>
      {org.description && (
        <p
          className="text-sm text-gray-500 line-clamp-2"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(org.description),
          }}
        />
      )}
      <p className="mt-2 text-xs text-gray-400">
        {org.members.length} member{org.members.length !== 1 ? 's' : ''}
      </p>
    </button>
  )
}
