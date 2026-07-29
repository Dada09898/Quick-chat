import { useEffect, Suspense } from 'react'
import { useThemeStore } from './store/themeStore'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RealtimeProvider } from './realtime/RealtimeProvider'
import { useAuthStore } from './store/authStore'
import { Toaster } from 'react-hot-toast'

import { ChatLayout } from './features/chat/ChatLayout'
import { LoginPage, RegisterPage } from './features/auth/AuthPages'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ProfileSettings } from './features/profile/ProfileSettings'
import { CallProvider } from './features/calls/CallProvider'

const queryClient = new QueryClient()

function App() {
  const { setTheme } = useThemeStore()

  useEffect(() => {
    // Initialize theme to dark by default
    setTheme('dark')
  }, [])

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isRestoring = useAuthStore(state => state.isRestoring);
  const restoreSession = useAuthStore(state => state.restoreSession);

  // Restore session from HttpOnly cookies on app mount (only once)
  useEffect(() => {
    restoreSession();
  }, []);

  // Show loading while checking session — prevents flash of login page
  if (isRestoring) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#202c33', color: '#e9edef', border: '1px solid #222d34' } }} />
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
          <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
              <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage onBack={() => window.history.back()} />} />
              
              {/* Protected Routes — RealtimeProvider only wraps authenticated routes */}
              <Route path="/" element={
                isAuthenticated ? (
                  <RealtimeProvider>
                    <CallProvider>
                      <ChatLayout />
                    </CallProvider>
                  </RealtimeProvider>
                ) : <Navigate to="/login" />
              } />
              <Route path="/settings" element={
                isAuthenticated ? (
                  <RealtimeProvider>
                    <ProfileSettings />
                  </RealtimeProvider>
                ) : <Navigate to="/login" />
              } />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
