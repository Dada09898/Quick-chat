import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

const mockState = {
  user: null,
  isAuthenticated: false,
  isRestoring: false,
  restoreSession: vi.fn(),
  setUser: vi.fn(),
  logout: vi.fn()
};

vi.mock('./store/authStore', () => ({
  useAuthStore: vi.fn((selector) => selector ? selector(mockState) : mockState)
}))

describe('Auth Flow', () => {
  it('renders login page when unauthenticated', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Sign in to your enterprise vault.')).toBeInTheDocument();
    });
  })
})
