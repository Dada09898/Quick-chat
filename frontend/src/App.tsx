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
const CallProvider = lazy(() => import('./features/calls/CallProvider').then(module => ({ default: module.CallProvider })))

const queryClient = new QueryClient()

function App() {
  console.log("DEBUG: App mounted");
  const { setTheme } = useThemeStore()

  useEffect(() => {
    // Initialize theme
    setTheme('system')
  }, [setTheme])

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isRestoring = useAuthStore(state => state.isRestoring);
  const restoreSession = useAuthStore(state => state.restoreSession);

  // Restore session from HttpOnly cookies on app mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
                      {console.log("DEBUG: Route '/' render")}
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
