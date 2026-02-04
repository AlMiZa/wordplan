import { useState, useEffect } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { LanguageSelectionModal } from '@/components/LanguageSelectionModal'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, profile, loading } = useUser()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  // Check for first-time user (no language selected)
  useEffect(() => {
    if (user && profile && profile.target_language === null && location.pathname !== '/settings') {
      setShowLanguageModal(true)
    }
  }, [user, profile, location.pathname])

  // Show nothing while checking authentication
  if (loading) {
    return null
  }

  // Redirect to login if not authenticated
  if (!user) {
    const params = new URLSearchParams(searchParams)
    params.set('redirect', location.pathname)

    return <Navigate to={`/auth/login?${params.toString()}`} replace />
  }

  return (
    <>
      {children}
      <LanguageSelectionModal
        open={showLanguageModal}
        onOpenChange={setShowLanguageModal}
        isFirstTime={true}
      />
    </>
  )
}
