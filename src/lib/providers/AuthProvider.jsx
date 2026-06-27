import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/api'
import { login as loginFn, register as registerFn, logout as logoutFn, getSession as readSession, setSession as writeSession } from '@/lib/auth'

const AuthContext = createContext(null)

function validateSession(s) {
  if (!s || typeof s !== 'object') return null
  // Bắt buộc phải có token hợp lệ; session corrupt → coi như chưa đăng nhập
  if (!s.token || typeof s.token !== 'string') return null
  // Role phải nằm trong whitelist — tránh role lạ khiến getRolePath trả '/'
  const validRoles = ['ADMIN', 'EDITOR_BOARD', 'TANTOU', 'MANGAKA', 'ASSISTANT']
  if (!validRoles.includes(String(s.role ?? '').toUpperCase())) return null
  return s
}

export function AuthProvider({ children }) {
  // Bắt đầu ở loading=true để ProtectedRoute/GuestRoute không render nhánh sai
  // trong khi hydrate session từ sessionStorage (tránh flash trắng / redirect nhầm)
  const [user, setUser] = useState(() => validateSession(readSession()))
  const [loading, setLoading] = useState(true)
  // loggingIn là React state — thay vì module-level flag — để ProtectedRoute re-render khi nó thay đổi
  const [loggingIn, setLoggingIn] = useState(false)
  const navigate = useNavigate()

  console.log('[AuthProvider] render', { user: !!user, loading, loggingIn })

  useEffect(() => {
    // Hydrate xong — tắt loading ở tick kế tiếp để tránh render lần đầu với state sai
    setUser(validateSession(readSession()))
    setLoading(false)

    const onSync = () => setUser(validateSession(readSession()))
    const onAuthChange = () => setUser(validateSession(readSession()))

    const on401 = () => {
      console.log('[AuthProvider] auth-401 event → navigate /login')
      navigate('/login', { replace: true })
    }

    window.addEventListener('storage', onSync)
    window.addEventListener('auth-session-change', onAuthChange)
    window.addEventListener('auth-401', on401)
    return () => {
      window.removeEventListener('storage', onSync)
      window.removeEventListener('auth-session-change', onAuthChange)
      window.removeEventListener('auth-401', on401)
    }
  }, [navigate])

  const login = useCallback(async (username, password) => {
    console.log('[AuthProvider] 🔐 login START', { username })

    setLoading(true)
    setLoggingIn(true)

    try {
      const u = await loginFn(username, password)
      console.log('[AuthProvider] ✅ loginFn resolved', u)
      setUser(u)
      return u
    } catch (err) {
      console.log('[AuthProvider] ❌ loginFn ERROR:', err)
      throw err
    } finally {
      console.log('[AuthProvider] 🧹 login END cleanup — loggingIn → false')
      setLoading(false)
      setLoggingIn(false)
    }
  }, [])

  const register = useCallback(async (data) => {
    console.log('[AuthProvider] 🔐 register START')
    setLoading(true)
    setLoggingIn(true)
    try {
      const u = await registerFn(data)
      console.log('[AuthProvider] ✅ registerFn resolved', u)
      setUser(u)
      return u
    } finally {
      console.log('[AuthProvider] 🧹 register END cleanup — loggingIn → false')
      setLoading(false)
      setLoggingIn(false)
    }
  }, [])

  const logout = useCallback(async () => {
    console.log('[AuthProvider] 🚪 logout START')
    await logoutFn()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loggingIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
