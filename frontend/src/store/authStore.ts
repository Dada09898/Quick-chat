import { create } from 'zustand'

interface User {
  id: string
  email: string
  is_user_a: boolean
  avatar?: string
  bio?: string
  presence_status?: 'online' | 'offline' | 'away' | 'dnd'
  last_seen?: string
  timezone?: string
  preferred_language?: string
  last_login: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
