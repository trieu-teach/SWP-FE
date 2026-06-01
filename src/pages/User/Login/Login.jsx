import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { AuthShell } from '@/components/layout/AuthShell.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, getRolePath, mockLogin } from '@/lib/auth.js'

const NAV_LINKS = [{ to: '/', label: 'Trang chủ' }]

export { ROLES, ROLE_OPTIONS, ROLE_LABELS, getRolePath, getSession, logout, mockLogin, mockRegister } from '@/lib/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = getSession()
    if (user) {
      navigate(getRolePath(user.role), { replace: true })
      return
    }
    const saved = sessionStorage.getItem('rememberEmail')
    if (saved) setForm(f => ({ ...f, email: saved }))
  }, [navigate])

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const user = await mockLogin(form.email, form.password)
      if (remember) sessionStorage.setItem('rememberEmail', form.email.trim())
      else sessionStorage.removeItem('rememberEmail')
      navigate(getRolePath(user.role))
    } catch (err) {
      setError(err?.message ?? 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header links={NAV_LINKS} />
      <AuthShell
        title="Đăng nhập workspace"
        subtitle="Demo: mangaka@test.com / assistant@test.com — mật khẩu 123456. Mỗi email gắn một vai trò."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Đăng ký
            </Link>
          </p>
        }
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>Email đã đăng ký sẽ luôn đăng nhập với đúng một vai trò.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="ban@example.com"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                    value={form.password}
                    onChange={e => setField('password', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-muted-foreground">Ghi nhớ email</span>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthShell>
      <Footer />
    </div>
  )
}
