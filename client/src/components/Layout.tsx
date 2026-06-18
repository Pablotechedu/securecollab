import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import useAuthStore from '../store/authStore'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { orgId } = useParams<{ orgId?: string }>()
  const storedUser = useAuthStore((s) => s.user)
  const displayUser = user ?? storedUser

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/orgs"
            className="text-lg font-bold text-indigo-700 tracking-tight"
          >
            SecureCollab
          </Link>
          {orgId && (
            <>
              <Link
                to={`/orgs/${orgId}/projects`}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Projects
              </Link>
              <Link
                to={`/orgs/${orgId}/members`}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Team
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {displayUser?.role === 'super_admin' && (
            <Link
              to="/admin/users"
              className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full hover:bg-purple-200 transition-colors"
            >
              Admin
            </Link>
          )}
          {displayUser && (
            <span className="text-sm text-gray-600">{displayUser.name}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
