import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('./store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    setUser: vi.fn(),
    logout: vi.fn()
  }))
}))

describe('Auth Flow', () => {
  it('renders DualConnect title', () => {
    render(<App />)
    expect(screen.getByText('DualConnect')).toBeDefined()
  })
})
