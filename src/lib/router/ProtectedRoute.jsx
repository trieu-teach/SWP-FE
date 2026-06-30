import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/providers'
import { getRolePath } from '@/lib/auth'

export function ProtectedRoute({ roles = [] }) {
  const ctx = useAuth()

  if (!ctx) {
    return <div>Loading...</div>
  }

  const { user, loading, loggingIn } = ctx

  if (loading || loggingIn) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const role = user.role?.toUpperCase()

  if (roles.length > 0) {
    const allowed = roles.map(r => r.toUpperCase()).includes(role)
    if (!allowed) {
      const fallbackPath = getRolePath(role)
      console.warn('[ProtectedRoute] Role không đủ quyền hoặc không xác định:', role, '→ fallback:', fallbackPath)
      // Đã đăng nhập nhưng sai role / role không resolve được → KHÔNG đá về /login.
      return <Navigate to={fallbackPath || '/'} replace />
    }
  }

  return <Outlet />
}

export function GuestRoute() {
  const ctx = useAuth()

  if (!ctx) {
    return <div>Loading...</div>
  }

  const { user, loading, loggingIn } = ctx

  if (loading || loggingIn) {
    return <div>Loading...</div>
  }

  if (user) {
    const role = user.role?.toUpperCase()
    const path = getRolePath(role)
    return <Navigate to={path || '/'} replace />
  }

  return <Outlet />
}