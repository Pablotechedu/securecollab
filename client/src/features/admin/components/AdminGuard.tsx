import { Navigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AdminGuard({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/orgs" replace />
  }

  return <>{children}</>
}
