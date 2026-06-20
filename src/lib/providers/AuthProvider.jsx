import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '@/api'
import { login as loginFn, register as registerFn, logout as logoutFn, getSession as readSession, setSession as writeSession } from '@/lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onSync = () => setUser(readSession())
    const onAuthChange = () => setUser(readSession())
    window.addEventListener('storage', onSync)
    window.addEventListener('auth-session-change', onAuthChange)
    return () => {
      window.removeEventListener('storage', onSync)
      window.removeEventListener('auth-session-change', onAuthChange)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const u = await loginFn(username, password)
      setUser(u)
      return u
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (data) => {
    setLoading(true)
    try {
      const u = await registerFn(data)
      setUser(u)
      return u
    } finally {
      setLoading(false)
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
