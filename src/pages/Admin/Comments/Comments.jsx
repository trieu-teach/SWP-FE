import { useEffect, useState } from 'react'
import { Check, Flag, Heart, Loader2, MessageSquare, Search, Trash2 } from 'lucide-react'
import { api } from '@/api/index.js'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function Comments() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState([])

  useEffect(() => {
    api.getComments().then(d => { setList(d); setLoading(false) })
  }, [])

  async function handleDelete(id) {
    await api.deleteComment(id)
    setList(l => l.filter(c => c.id !== id))
    setSelected(s => s.filter(i => i !== id))
  }

  async function handleApprove(id) {
    await api.approveComment(id)
    setList(l => l.map(c => c.id === id ? { ...c, flagged: false } : c))
  }

  async function handleBulkDelete() {
    if (!confirm(`Xoá ${selected.length} bình luận đã chọn?`)) return
    await Promise.all(selected.map(id => api.deleteComment(id)))
    setList(l => l.filter(c => !selected.includes(c.id)))
    setSelected([])
  }

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  }

  function toggleAll() {
    const ids = filtered.map(c => c.id)
    setSelected(s => s.length === ids.length ? [] : ids)
  }

  const filtered = list.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.user.toLowerCase().includes(q) || c.content.toLowerCase().includes(q) || c.mangaTitle.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || (filter === 'flagged' && c.flagged)
    return matchSearch && matchFilter
  })

  const flaggedCount = list.filter(c => c.flagged).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bình luận</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {flaggedCount} bình luận bị báo cáo · {list.length} tổng
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm nội dung, người dùng..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex rounded-md border bg-background p-0.5">
            {[
              { v: 'all', label: 'Tất cả' },
              { v: 'flagged', label: 'Bị báo cáo', icon: Flag },
            ].map(f => (
              <Button
                key={f.v}
                size="sm"
                variant={filter === f.v ? 'secondary' : 'ghost'}
                onClick={() => setFilter(f.v)}
              >
                {f.icon ? <f.icon className="size-3.5" /> : null}
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected.length > 0 ? (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <span className="text-sm font-medium">Đã chọn {selected.length} bình luận</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Bỏ chọn</Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="size-3.5" />
                Xoá tất cả
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
                  <th className="px-4 py-3" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="size-4 cursor-pointer rounded border-input accent-primary"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Người dùng</th>
                  <th className="px-4 py-3 text-left font-medium">Nội dung</th>
                  <th className="px-4 py-3 text-left font-medium">Truyện</th>
                  <th className="px-4 py-3 text-left font-medium">Thích</th>
                  <th className="px-4 py-3 text-left font-medium">Thời gian</th>
                  <th className="px-4 py-3" style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className={cn(
                      'hover:bg-muted/30',
                      c.flagged && 'bg-rose-50/40 dark:bg-rose-500/5',
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="size-4 cursor-pointer rounded border-input accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-rose-500 text-[10px] font-bold text-primary-foreground">
                            {c.userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{c.user}</span>
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-2 text-sm">{c.content}</p>
                      {c.flagged ? (
                        <Badge variant="destructive" className="mt-1.5 gap-1 text-[10px]">
                          <Flag className="size-2.5" />
                          Bị báo cáo
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{c.mangaTitle}</div>
                      <div className="text-xs text-muted-foreground">Ch.{c.chapter}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="size-3 text-rose-500" />
                        {c.likes}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {c.flagged ? (
                          <Button size="icon-sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700" onClick={() => handleApprove(c.id)}>
                            <Check className="size-3.5" />
                          </Button>
                        ) : null}
                        <Button size="icon-sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <MessageSquare className="size-8 opacity-30" />
                <p className="mt-2 text-sm">Không có bình luận nào</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  )
}
