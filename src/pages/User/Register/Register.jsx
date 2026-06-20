import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { AuthShell, RoleCard } from '@/components/layout/AuthShell.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ROLES,
  ROLE_OPTIONS,
  register,
  getRolePath,
} from '@/lib/auth.js'

const NAV_LINKS = [{ to: '/', label: 'Trang chủ' }]

const ROLE_ICONS = {
  MANGAKA: '✍️',
  ASSISTANT: '🎨',
}

const ROLE_DESCS = {
  MANGAKA: 'Tạo series, upload chapter, đánh dấu vùng giao việc cho Assistant.',
  ASSISTANT: 'Nhận draft từ Mangaka, vẽ layer trong suốt và gửi lại bản ghép.',
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ROLES.MANGAKA,
  })
  const [agree, setAgree] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (error) setError('')
  }

  function validate() {
    if (!form.username.trim()) return 'Vui lòng nhập tên đăng nhập.'
    if (form.username.trim().length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự.'
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên.'
    if (!form.email.trim()) return 'Vui lòng nhập email.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email không hợp lệ.'
    if (!form.role) return 'Vui lòng chọn vai trò.'
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.'
    if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.'
    if (!agree) return 'Bạn cần đồng ý với điều khoản sử dụng.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }

    setLoading(true)
    setError('')

    try {
      const user = await register({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      navigate(getRolePath(user.role) || '/')
    } catch (err) {
      const status = err?.response?.status
      const body = err?.response?.data
      const message = typeof body === 'string' ? body : body?.message ?? body?.title
      let text = message || err?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      if (status === 409) text = 'Tên đăng nhập đã tồn tại.'
      else if (status === 400) text = message || 'Dữ liệu không hợp lệ (chỉ được đăng ký Mangaka hoặc Assistant).'
      setError(text)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header links={NAV_LINKS} />
      <AuthShell
        title="Tham gia MangaHub"
        subtitle="Tự đăng ký với vai trò Mangaka hoặc Assistant. Tantou Editor / Editor Board / Admin do quản trị cấp tài khoản."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        }
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Đăng ký</CardTitle>
            <CardDescription>Chọn vai trò và điền thông tin tài khoản.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Vai trò của bạn</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLE_OPTIONS.map(opt => (
                    <RoleCard
                      key={opt.value}
                      active={form.role === opt.value}
                      icon={ROLE_ICONS[opt.value] ?? opt.icon ?? '👤'}
                      title={opt.label}
                      desc={ROLE_DESCS[opt.value] ?? opt.desc}
                      onSelect={() => setField('role', opt.value)}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Tên đăng nhập</Label>
                  <Input
                    id="reg-username"
                    autoComplete="username"
                    placeholder="mangaka_demo"
                    value={form.username}
                    onChange={e => setField('username', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Họ và tên</Label>
                  <Input
                    id="reg-name"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    value={form.fullName}
                    onChange={e => setField('fullName', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="ban@example.com"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Mật khẩu</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Tối thiểu 6 ký tự"
                      className="pr-10"
                      value={form.password}
                      onChange={e => setField('password', e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setShowPass(v => !v)}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Xác nhận</Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Nhập lại"
                      className="pr-10"
                      value={form.confirmPassword}
                      onChange={e => setField('confirmPassword', e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1 rounded" />
                <span>Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.</span>
              </label>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthShell>
      <Footer />
    </div>
  )
}
