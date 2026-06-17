import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'
import type { AuthResponse } from '../../../types'

export function useAuth() {
  const { setAuth, clearAuth, user } = useAuthStore()

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    })
    setAuth(data.accessToken, data.refreshToken, data.user)
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
    })
    setAuth(data.accessToken, data.refreshToken, data.user)
  }

  async function logout() {
    const refreshToken = useAuthStore.getState().refreshToken
    try {
      await api.post('/auth/logout', { refreshToken })
    } finally {
      clearAuth()
    }
  }

  return { login, register, logout, user }
}
