import { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import AdminPanel from './components/AdminPanel'
import { useAuth } from './auth/AuthContext'
import AppContent from './AppContent'
import { isAdminRoute, navigateTo } from './utils/routes'

function useAdminRoute() {
  const [adminRoute, setAdminRoute] = useState(() => isAdminRoute())
  useEffect(() => {
    const sync = () => setAdminRoute(isAdminRoute())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  return adminRoute
}

export default function App() {
  const { user, loading } = useAuth()
  const adminRoute = useAdminRoute()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Đang khởi tạo...</p>
      </div>
    )
  }

  if (adminRoute) {
    return <AdminPanel onBack={() => navigateTo('/')} />
  }

  if (!user) {
    return <AuthScreen />
  }

  return <AppContent />
}
