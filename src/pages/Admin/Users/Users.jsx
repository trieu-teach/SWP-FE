import { useEffect, useState } from 'react'
import { Eye, Loader2, Lock, Search, ShieldCheck, Unlock, X } from 'lucide-react'
import { api } from '@/api/index.js'
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
import { cn } from '@/lib/utils'

const ROLE_LABEL = { admin: 'Admin', mod: 'Mod', user: 'User' }
const ROLE_CLS = {
  admin: 'bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400',
  mod: 'bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-400',
  user: 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-500/15 dark:text-slate-400',
}
const STATUS_LABEL = { active: 'Hoạt động', banned: 'Đã khoá' }
const STATUS_CLS = {
  active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400',
  banned: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400',
}

function UserDrawer({ user, onClose, onBan, onUnban, onChangeRole }) {
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
          <Badge className={ROLE_CLS[user.role]} variant="secondary">{ROLE_LABEL[user.role]}</Badge>
        </div>

        <div className="grid grid-cols-3 divide-x border-b py-4 text-center">
          {[
            { label: 'Lượt đọc', value: user.readCount.toLocaleString() },
            { label: 'Bình luận', value: user.comments },
            { label: 'Báo cáo', value: user.reports },
          ].map(s => (
            <div key={s.label} className="px-2">
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
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
                <Badge className={STATUS_CLS[user.status]} variant="secondary">{STATUS_LABEL[user.status]}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đổi vai trò</p>
            <div className="flex gap-2">
              {['user', 'mod', 'admin'].map(r => (
                <Button
                  key={r}
                  size="sm"
                  variant={user.role === r ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => onChangeRole(user.id, r)}
                >
                  {ROLE_LABEL[r]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          {user.status === 'active' ? (
            <Button variant="destructive" className="w-full" onClick={() => onBan(user.id)}>
              <Lock className="size-4" />
              Khoá tài khoản
            </Button>
          ) : (
            <Button className="w-full" onClick={() => onUnban(user.id)}>
              <Unlock className="size-4" />
              Mở khoá
            </Button>
          )}
        </div>
      </aside>
    </div>
  )
}

export default function Users() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.getUsers().then(d => { setList(d); setLoading(false) })
  }, [])

  async function handleBan(id) {
    await api.updateUserStatus(id, 'banned')
    setList(l => l.map(u => u.id === id ? { ...u, status: 'banned' } : u))
    setSelected(s => s?.id === id ? { ...s, status: 'banned' } : s)
  }

  async function handleUnban(id) {
    await api.updateUserStatus(id, 'active')
    setList(l => l.map(u => u.id === id ? { ...u, status: 'active' } : u))
    setSelected(s => s?.id === id ? { ...s, status: 'active' } : s)
  }

  async function handleChangeRole(id, role) {
    await api.updateUserRole(id, role)
    setList(l => l.map(u => u.id === id ? { ...u, role } : u))
    setSelected(s => s?.id === id ? { ...s, role } : s)
  }

  const filtered = list.filter(u => {
    const q = search.toLowerCase()
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (roleFilter === 'all' || u.role === roleFilter)
  })

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
            <Input placeholder="Tìm tên, email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="mod">Mod</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
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
                  <th className="px-4 py-3 text-left font-medium">Đọc</th>
                  <th className="px-4 py-3 text-left font-medium">BL</th>
                  <th className="px-4 py-3 text-left font-medium">Báo cáo</th>
                  <th className="px-4 py-3 text-left font-medium">Tham gia</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3" style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(u => (
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
                    <td className="px-4 py-3">
                      <Badge className={ROLE_CLS[u.role]} variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">{u.readCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{u.comments}</td>
                    <td className={cn('px-4 py-3', u.reports > 0 && 'font-semibold text-destructive')}>{u.reports}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.joinDate}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_CLS[u.status]} variant="secondary">{STATUS_LABEL[u.status]}</Badge>
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

      {selected ? (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onBan={handleBan}
          onUnban={handleUnban}
          onChangeRole={handleChangeRole}
        />
      ) : null}
    </div>
  )
}
