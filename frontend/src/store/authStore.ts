import { create } from 'zustand'
import { apiClient } from '../lib/api'

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
  isRestoring: boolean
  setUser: (user: User | null) => void
  logout: () => void
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isRestoring: true, // Start true so we don't flash login page on refresh

  setUser: (user) => set({ user, isAuthenticated: !!user, isRestoring: false }),
  
  logout: () => set({ user: null, isAuthenticated: false, isRestoring: false }),

  restoreSession: async () => {
    // Called on app mount to check if HttpOnly cookies still hold a valid session.
    // If yes, populate the store without requiring re-login.
    try {
      const res = await apiClient('/api/auth/me/')
      if (res.ok) {
        const user = await res.json()
        set({ user, isAuthenticated: true, isRestoring: false })
      } else {
        set({ user: null, isAuthenticated: false, isRestoring: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isRestoring: false })
    }
  },
}))
