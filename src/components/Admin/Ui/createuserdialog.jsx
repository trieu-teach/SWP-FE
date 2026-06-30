import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Dialog này chỉ dùng để tạo tài khoản NHÂN VIÊN nội bộ — Editorial Board và
// Tantou Editor. Mangaka/Assistant là người dùng tự đăng ký qua hệ thống,
// không tạo qua đây. Admin cũng không tạo qua đây (xem CREATABLE_ROLES ở dưới).
const CREATABLE_ROLES = [
  { id: 2, key: 'eb',     label: 'Editorial Board' },
  { id: 3, key: 'editor', label: 'Tantou Editor' },
]

function buildInitialForm() {
  return { username: '', password: '', fullName: '', email: '', roleId: '' }
}

function validate(form) {
  const errors = {}
  if (!form.username.trim()) errors.username = 'Username không được để trống.'
  if (!form.password.trim()) errors.password = 'Mật khẩu không được để trống.'
  else if (form.password.length < 6) errors.password = 'Mật khẩu cần ít nhất 6 ký tự.'
  if (!form.fullName.trim()) errors.fullName = 'Họ và tên không được để trống.'
  if (!form.email.trim()) errors.email = 'Email không được để trống.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Email không hợp lệ.'
  }
  if (!form.roleId) errors.roleId = 'Vui lòng chọn vai trò.'
  return errors
}

export default function CreateUserDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(buildInitialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  function updateField(key, value) {
    setForm(cur => ({ ...cur, [key]: value }))
    setErrors(cur => ({ ...cur, [key]: '' }))
  }

  function resetAndClose() {
    setForm(buildInitialForm())
    setErrors({})
    setServerError('')
    setOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setServerError('')
    try {
      await onCreated({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        roleId: Number(form.roleId),
      })
      resetAndClose()
    } catch (err) {
      // Lỗi 409 (username/email đã tồn tại) hoặc 400 validation từ backend
      const apiErrors = err?.response?.data?.errors
      if (apiErrors && typeof apiErrors === 'object') {
        const firstMsg = Object.values(apiErrors).flat()[0]
        setServerError(firstMsg || 'Có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.')
      } else {
        setServerError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) resetAndClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Tạo tài khoản
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo tài khoản nhân viên</DialogTitle>
          <DialogDescription>
            Tạo tài khoản cho Editorial Board hoặc Tantou Editor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cu-username">Username</Label>
            <Input
              id="cu-username"
              value={form.username}
              onChange={e => updateField('username', e.target.value)}
              placeholder="vd: editor01"
              autoComplete="off"
            />
            {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-password">Mật khẩu</Label>
            <Input
              id="cu-password"
              type="password"
              value={form.password}
              onChange={e => updateField('password', e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-fullname">Họ và tên</Label>
            <Input
              id="cu-fullname"
              value={form.fullName}
              onChange={e => updateField('fullName', e.target.value)}
              placeholder="vd: Nguyễn Văn An"
            />
            {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="vd: an.nguyen@example.com"
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select value={String(form.roleId)} onValueChange={v => updateField('roleId', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
              <SelectContent>
                {CREATABLE_ROLES.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-xs text-red-600">{errors.roleId}</p>}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}