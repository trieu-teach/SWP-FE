import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/providers'
import { getRolePath } from '@/lib/auth'

export function ProtectedRoute({ roles = [] }) {
  const ctx = useAuth()

  console.log('[ProtectedRoute] 🟢 render', ctx ? 'ctx OK' : 'ctx NULL')

  if (!ctx) {
    console.log('[ProtectedRoute] ❌ ctx NULL — AuthProvider chưa wrap')
    return <div>Loading...</div>
  }

  const { user, loading, loggingIn } = ctx

  console.log('[ProtectedRoute] 👤 user:', user?.username, 'role:', user?.role)
  console.log('[ProtectedRoute] ⏳ loading:', loading, '| loggingIn:', loggingIn)

  if (loading || loggingIn) {
    console.log('[ProtectedRoute] ⏳ BLOCK — đang loading/login')
    return <div>Loading...</div>
  }

  if (!user) {
    console.log('[ProtectedRoute] 🚫 NO USER → /login')
    return <Navigate to="/login" replace />
  }

  const role = user.role?.toUpperCase()

  if (roles.length > 0) {
    const allowed = roles.map(r => r.toUpperCase()).includes(role)
    if (!allowed) {
      const fallbackPath = getRolePath(role)
      console.log('[ProtectedRoute] 🚫 ROLE BLOCK', role, '→ fallback:', fallbackPath)
      return <Navigate to={fallbackPath || '/login'} replace />
    }
  }

  console.log('[ProtectedRoute] ✅ ALLOW ACCESS')
  return <Outlet />
}

export function GuestRoute() {
  const ctx = useAuth()

  console.log('[GuestRoute] 🟡 render', ctx ? 'ctx OK' : 'ctx NULL')

  if (!ctx) {
    console.log('[GuestRoute] ❌ ctx NULL')
    return <div>Loading...</div>
  }

  const { user, loading, loggingIn } = ctx

  console.log('[GuestRoute] 👤 user:', user?.username, '| loading:', loading, '| loggingIn:', loggingIn)

  if (loading || loggingIn) {
    console.log('[GuestRoute] ⏳ BLOCK — đang loading/login')
    return <div>Loading...</div>
  }

  if (user) {
    const role = user.role?.toUpperCase()
    const path = getRolePath(role)
    console.log('[GuestRoute] 🔁 redirect logged-in user', role, '→', path)
    return <Navigate to={path || '/'} replace />
  }

  console.log('[GuestRoute] ✅ Guest allowed — render Outlet')
  return <Outlet />
}
