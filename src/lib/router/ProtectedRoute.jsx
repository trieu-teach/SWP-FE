import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/providers'

export function ProtectedRoute({ roles = [] }) {
  const ctx = useAuth()
  if (!ctx) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  const { user, loading } = ctx

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles.length > 0 && !roles.map(r => r.toUpperCase()).includes(user.role?.toUpperCase())) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const ctx = useAuth()
  if (!ctx) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  const { user, loading } = ctx

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
