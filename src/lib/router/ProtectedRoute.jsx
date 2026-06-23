import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/providers'
import { isLoggingIn } from '@/lib/providers/AuthProvider'
import { getRolePath } from '@/lib/auth'

export function ProtectedRoute({ roles = [] }) {
  const ctx = useAuth()

  console.log("🟢 ProtectedRoute ctx:", ctx)

  if (!ctx) {
    console.log("❌ ctx NULL -> AuthProvider chưa wrap")
    return <div>Loading...</div>
  }

  const { user, loading } = ctx

  console.log("👤 user:", user)
  console.log("⏳ loading:", loading)
  console.log("🚦 isLoggingIn:", isLoggingIn)

  if (loading || isLoggingIn) {
    console.log("⏳ STILL LOADING STATE")
    return <div>Loading...</div>
  }

  if (!user) {
    console.log("🚫 NO USER -> login")
    return <Navigate to="/login" replace />
  }

  // ✅ normalize role an toàn
  const role = user.role?.toUpperCase()

  // check role access
  if (roles.length > 0) {
    const allowed = roles.map(r => r.toUpperCase()).includes(role)

    if (!allowed) {
      const fallbackPath = getRolePath(role)

      console.log("🚫 ROLE BLOCK -> role:", role, "fallback:", fallbackPath)

      // ❗ chống crash nếu fallbackPath null
      return <Navigate to={fallbackPath || '/login'} replace />
    }
  }

  console.log("✅ ALLOW ACCESS")
  return <Outlet />
}

export function GuestRoute() {
  const ctx = useAuth()

  console.log("🟡 GuestRoute ctx:", ctx)

  if (!ctx) {
    console.log("❌ ctx NULL in GuestRoute")
    return <div>Loading...</div>
  }

  const { user, loading } = ctx

  console.log("👤 user:", user)
  console.log("⏳ loading:", loading)
  console.log("🚦 isLoggingIn:", isLoggingIn)

  if (loading || isLoggingIn) {
    console.log("⏳ GuestRoute loading state")
    return <div>Loading...</div>
  }

  if (user) {
    const role = user.role?.toUpperCase()
    const path = getRolePath(role)

    console.log("🔁 redirect user role:", role, "path:", path)

    // ❗ chống crash tuyệt đối
    return <Navigate to={path || '/'} replace />
  }

  console.log("✅ Guest allowed")
  return <Outlet />
}