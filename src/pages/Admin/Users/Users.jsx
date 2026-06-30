import { useEffect, useState } from 'react'
import { Eye, Loader2, Lock, Search, Unlock, X } from 'lucide-react'
import { api } from '@/api/Adminapi.js'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// roleId → label/class
const ROLES = [
  { id: 1, key: 'admin',    label: 'Admin',          cls: 'bg-rose-100 text-rose-700 hover:bg-rose-100' },
  { id: 2, key: 'eb',       label: 'Editorial Board', cls: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
  { id: 3, key: 'editor',   label: 'Tantou Editor',  cls: 'bg-violet-100 text-violet-700 hover:bg-violet-100' },
  { id: 4, key: 'mangaka',  label: 'Mangaka',        cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  { id: 5, key: 'assistant',label: 'Assistant',      cls: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
]
const ROLE_BY_KEY = Object.fromEntries(ROLES.map(r => [r.key, r]))
const ROLE_BY_ID  = Object.fromEntries(ROLES.map(r => [r.id,  r]))

const STATUS_LABEL = { active: 'Hoạt động', banned: 'Đã khoá' }
const STATUS_CLS = {
  active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  banned: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
}

function RoleBadge({ roleKey }) {
  const r = ROLE_BY_KEY[roleKey] ?? { label: roleKey, cls: 'bg-slate-100 text-slate-700' }
  return <Badge className={r.cls} variant="secondary">{r.label}</Badge>
}

function UserDrawer({ user, onClose, onToggleStatus, onChangeRole }) {
  const [changing, setChanging] = useState(false)

  async function handleToggle() {
    try {
      setChanging(true)
      await onToggleStatus(user.id, user.status === 'active' ? 'banned' : 'active')
    } finally {
      setChanging(false)
    }
  }

  async function handleChangeRole(roleKey) {
    try {
      setChanging(true)
      await onChangeRole(user.id, roleKey)
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-semibold">Chi tiết người dùng</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3 border-b py-6">
          <Avatar className="size-20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-rose-500 text-2xl font-bold text-primary-foreground">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <RoleBadge roleKey={user.role} />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tham gia</span>
                <span className="font-medium">{user.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <Badge className={STATUS_CLS[user.status] ?? STATUS_CLS.active} variant="secondary">
                  {STATUS_LABEL[user.status] ?? user.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đổi vai trò</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <Button
                  key={r.key}
                  size="sm"
                  variant={user.role === r.key ? 'default' : 'outline'}
                  onClick={() => handleChangeRole(r.key)}
                  disabled={changing}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          {user.status === 'active' ? (
            <Button variant="destructive" className="w-full" onClick={handleToggle} disabled={changing}>
              <Lock className="mr-2 size-4" />
              Khoá tài khoản
            </Button>
          ) : (
            <Button className="w-full" onClick={handleToggle} disabled={changing}>
              <Unlock className="mr-2 size-4" />
              Mở khoá
            </Button>
          )}
        </div>
      </aside>
    </div>
  )
}

export default function Users() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const d = await api.getUsers()
      setList(d)
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(id, newStatus) {
    try {
      await api.updateUserStatus(id, newStatus)
      setList(l => l.map(u => u.id === id ? { ...u, status: newStatus } : u))
      setSelected(s => s?.id === id ? { ...s, status: newStatus } : s)
    } catch (err) {
      console.error('Status error:', err)
    }
  }

  async function handleChangeRole(id, roleKey) {
    const role = ROLE_BY_KEY[roleKey]
    if (!role) return
    try {
      await api.updateUserRole(id, role.id)
      setList(l => l.map(u => u.id === id ? { ...u, role: roleKey } : u))
      setSelected(s => s?.id === id ? { ...s, role: roleKey } : s)
    } catch (err) {
      console.error('Role error:', err)
    }
  }

  const filtered = list.filter(u => {
    const q = search.toLowerCase()
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (roleFilter === 'all' || u.role === roleFilter)
  })

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Độc giả</h1>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-destructive">
            <p className="text-sm font-medium">{error}</p>
            <Button onClick={loadData} className="mt-4">Thử lại</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Độc giả</h1>
        <p className="mt-1 text-sm text-muted-foreground">{list.length} tài khoản trong hệ thống</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, email..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              {ROLES.map(r => (
                <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-7 animate-spin" />
          <p className="mt-3 text-sm">Đang tải...</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Người dùng</th>
                  <th className="px-4 py-3 text-left font-medium">Vai trò</th>
                  <th className="px-4 py-3 text-left font-medium">Tham gia</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3" style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-rose-500 text-xs font-bold text-primary-foreground">
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge roleKey={u.role} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.joinDate}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_CLS[u.status] ?? STATUS_CLS.active} variant="secondary">
                        {STATUS_LABEL[u.status] ?? u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelected(u)}>
                        <Eye className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onToggleStatus={handleToggleStatus}
          onChangeRole={handleChangeRole}
        />
      )}
    </div>
  )
}