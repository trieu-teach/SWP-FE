import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/providers'
import { isLoggingIn } from '@/lib/providers/AuthProvider'
import { getRolePath } from '@/lib/auth'

export function ProtectedRoute({ roles = [] }) {
  const ctx = useAuth()
  if (!ctx) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  const { user, loading } = ctx

  if (loading || isLoggingIn) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles.length > 0 && !roles.map(r => r.toUpperCase()).includes(user.role?.toUpperCase())) {
    return <Navigate to={getRolePath(user.role)} replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const ctx = useAuth()
  if (!ctx) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  const { user, loading } = ctx

  if (loading || isLoggingIn) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (user) {
    return <Navigate to={getRolePath(user.role)} replace />
  }

  return <Outlet />
}
