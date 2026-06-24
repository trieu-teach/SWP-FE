import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/providers'
import { getRolePath } from '@/lib/auth'

export function ProtectedRoute({ roles = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
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
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (user) {
    return <Navigate to={getRolePath(user.role)} replace />
  }

  return <Outlet />
}