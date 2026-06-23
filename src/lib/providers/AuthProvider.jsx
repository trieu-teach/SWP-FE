import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/api'
import { login as loginFn, register as registerFn, logout as logoutFn, getSession as readSession, setSession as writeSession } from '@/lib/auth'

const AuthContext = createContext(null)

// Flag to prevent GuestRoute from redirecting while login navigation is in-flight
let isLoggingIn = false
export function setLoggingIn(val) { isLoggingIn = val }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession())
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onSync = () => setUser(readSession())
    const onAuthChange = () => setUser(readSession())

    const on401 = () => {
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
    console.log("🚀 LOGIN START", { username })
  
    setLoading(true)
    isLoggingIn = true
  
    try {
      const u = await loginFn(username, password)
  
      console.log("✅ LOGIN SUCCESS:", u)
  
      setUser(u)
      return u
    } catch (err) {
      console.log("❌ LOGIN ERROR:", err)
      throw err
    } finally {
      console.log("🧹 LOGIN END cleanup")
      setLoading(false)
      isLoggingIn = false
    }
  }, [])

  const register = useCallback(async (data) => {
    setLoading(true)
    isLoggingIn = true
    try {
      const u = await registerFn(data)
      setUser(u)
      return u
    } finally {
      setLoading(false)
      isLoggingIn = false
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutFn()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export { isLoggingIn }
