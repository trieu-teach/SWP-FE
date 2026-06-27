import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { AuthShell } from '@/components/layout/AuthShell.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/providers'
import { getRolePath } from '@/lib/auth.js'

const NAV_LINKS = [{ to: '/', label: 'Trang chủ' }]

export { ROLES, ROLE_OPTIONS, ROLE_LABELS, getRolePath, logout } from '@/lib/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem('rememberUsername')
    if (saved) setForm(f => ({ ...f, username: saved }))
  }, [])

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const user = await authLogin(form.username.trim(), form.password)
      if (remember) sessionStorage.setItem('rememberUsername', form.username.trim())
      else sessionStorage.removeItem('rememberUsername')
      toast.success(`Dang nhap thanh cong! Chao ${user.name || user.username}.`)
      navigate(getRolePath(user.role) || '/', { replace: true })
      console.log('User:', user)
console.log('Role:', user.role)
console.log('Path:', getRolePath(user.role))

navigate('/mangaka', { replace: true })

console.log('Navigate executed')
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data : err.response.data?.message ?? JSON.stringify(err.response.data))
        : err?.message
      setError(status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu.' : (msg || 'Đăng nhập thất bại.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header links={NAV_LINKS} />
      <AuthShell
        title="Đăng nhập workspace"
        subtitle="Tài khoản Mangaka/Assistant tự đăng ký. Tantou Editor / Editor Board / Admin do quản trị cấp."
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
            <CardDescription>Tên đăng nhập gắn liền một vai trò — không thể tự đổi.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="login-username">Tên đăng nhập</Label>
                <Input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  placeholder="mangaka_demo"
                  value={form.username}
                  onChange={e => setField('username', e.target.value)}
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
                  <span className="text-muted-foreground">Ghi nhớ tên đăng nhập</span>
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
