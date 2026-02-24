import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider } from './contexts/UserContext'
import { UserLayout } from './layouts/UserLayout'
import { AuthLayout } from './layouts/AuthLayout'
import DashboardPage from './pages/dashboard'
import LoginPage from './pages/login'
import SignUpPage from './pages/signup'
import WordsPage from './pages/words'
import RandomPhrasePage from './pages/random-phrase'
import SettingsPage from './pages/settings'
import ChatPage from './pages/chat'
import FlashcardsPage from './pages/flashcards'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <Routes>
            {/* Auth routes with /auth prefix */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignUpPage />} />
            </Route>

            {/* Dashboard routes at root */}
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/words" element={<WordsPage />} />
              <Route path="/random-phrase" element={<RandomPhrasePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/flashcards" element={<FlashcardsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </UserProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

export default App
