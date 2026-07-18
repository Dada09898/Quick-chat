import { useEffect } from 'react'
import { useThemeStore } from './store/themeStore'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RealtimeProvider } from './realtime/RealtimeProvider'
import { useAuthStore } from './store/authStore'
import { Suspense, lazy } from 'react'

// Code Splitting (Lazy Loading)
const ChatLayout = lazy(() => import('./features/chat/ChatLayout').then(module => ({ default: module.ChatLayout })))
const LoginPage = lazy(() => import('./features/auth/AuthPages').then(module => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./features/auth/AuthPages').then(module => ({ default: module.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })))
const ProfileSettings = lazy(() => import('./features/profile/ProfileSettings').then(module => ({ default: module.ProfileSettings })))

const queryClient = new QueryClient()

function App() {
  const { setTheme } = useThemeStore()

  useEffect(() => {
    // Initialize theme
    setTheme('system')
  }, [setTheme])

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
                <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage onBack={() => window.history.back()} />} />
                
                {/* Protected Routes */}
                <Route path="/" element={isAuthenticated ? <ChatLayout /> : <Navigate to="/login" />} />
                <Route path="/settings" element={isAuthenticated ? <ProfileSettings /> : <Navigate to="/login" />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </RealtimeProvider>
    </QueryClientProvider>
  )
}

export default App
