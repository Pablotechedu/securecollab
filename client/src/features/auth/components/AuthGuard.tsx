import { Navigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AuthGuard({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
