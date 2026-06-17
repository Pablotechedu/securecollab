import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (accessToken: string, refreshToken: string, user: User) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

// No persist — tokens must never reach localStorage or sessionStorage
const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAuth: (accessToken, refreshToken, user) =>
    set({ accessToken, refreshToken, user }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
}))

export default useAuthStore
