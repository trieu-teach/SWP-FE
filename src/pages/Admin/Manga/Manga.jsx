import { useEffect, useState } from 'react'
import {
  Edit,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '@/api/adminApi.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const STATUS_LABEL = {
  ongoing: { label: 'Đang ra', class: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400' },
  completed: { label: 'Hoàn thành', class: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-400' },
  hiatus: { label: 'Tạm dừng', class: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400' },
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ongoing', label: 'Đang ra' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'hiatus', label: 'Tạm dừng' },
]

function MangaDialog({ manga, open, onClose, onSave }) {
  const isEdit = !!manga?.id
  const [form, setForm] = useState({ title: '', author: '', genre: '', status: 'ongoing' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        title: manga?.title ?? '',
        author: manga?.author ?? '',
        genre: manga?.genre?.join(', ') ?? '',
        status: manga?.status ?? 'ongoing',
      })
    }
  }, [open, manga])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.title.trim()) return
    try {
      setSaving(true)
      const payload = {
        title: form.title,
        author: form.author,
        genre: form.genre.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status,
      }
      if (isEdit) {
        await api.updateManga(manga.id, payload)
      } else {
        await api.createManga(payload)
      }
      onSave()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa truyện' : 'Thêm truyện mới'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin bộ truyện' : 'Tạo bộ truyện mới trong hệ thống'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tên truyện *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Nhập tên truyện..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tác giả</Label>
              <Input value={form.author} onChange={e => set('author', e.target.value)} placeholder="Tên tác giả" />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Đang ra</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="hiatus">Tạm dừng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Thể loại</Label>
            <Input value={form.genre} onChange={e => set('genre', e.target.value)} placeholder="Hành động, Isekai..." />
            <p className="text-xs text-muted-foreground">Phân cách bằng dấu phẩy</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm truyện'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MangaDrawer({ manga, onClose, onEdit, onDelete }) {
  const st = STATUS_LABEL[manga.status] ?? STATUS_LABEL.ongoing
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-semibold">Chi tiết truyện</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div
            className="mb-5 flex aspect-[3/4] items-center justify-center rounded-xl text-5xl font-bold text-white shadow-lg"
            style={{ background: manga.bg }}
          >
            {manga.initials}
          </div>
          <h2 className="mb-1 text-xl font-bold">{manga.title}</h2>
          <p className="mb-4 text-sm text-muted-foreground">bởi {manga.author}</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(manga.genre ?? []).map(g => (
              <Badge key={g} variant="outline">{g}</Badge>
            ))}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Trạng thái</span>
              <Badge className={st.class} variant="secondary">{st.label}</Badge>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Số chương</span>
              <span className="font-medium">{manga.chapters}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Ngày tạo</span>
              <span className="font-medium">{manga.createdAt}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t p-4">
          <Button onClick={onEdit} className="flex-1">
            <Edit className="size-4" />
            Sửa
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Xoá
          </Button>
        </div>
      </aside>
    </div>
  )
}

export default function Manga() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState('table')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const d = await api.getMangaList()
      setList(d)
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu')
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setModal(null)
    await loadData()
  }

  async function handleDelete(id) {
    if (!confirm('Xoá truyện này?')) return
    try {
      await api.deleteManga(id)
      setSelected(null)
      setList(l => l.filter(m => m.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const filtered = list.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.author.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold tracking-tight">Quản lý truyện</h1></div>
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý truyện</h1>
          <p className="mt-1 text-sm text-muted-foreground">{list.length} bộ truyện trong hệ thống</p>
        </div>
        <Button onClick={() => setModal({})}>
          <Plus className="size-4" />
          Thêm truyện
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm theo tên, tác giả..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border bg-background p-0.5">
              <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setView('table')}>
                <List className="size-4" />
              </Button>
              <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setView('grid')}>
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-7 animate-spin" />
          <p className="mt-3 text-sm">Đang tải...</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(m => {
            const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.ongoing
            return (
              <Card key={m.id} onClick={() => setSelected(m)} className="group cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex aspect-[3/4] items-center justify-center text-4xl font-bold text-white" style={{ background: m.bg }}>
                  {m.initials}
                </div>
                <CardContent className="p-3">
                  <div className="truncate text-sm font-semibold">{m.title}</div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{m.chapters} ch</span>
                    <Badge className={cn('text-[10px]', st.class)} variant="secondary">{st.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium" style={{ width: 60 }}></th>
                  <th className="px-4 py-3 text-left font-medium">Tên truyện</th>
                  <th className="px-4 py-3 text-left font-medium">Thể loại</th>
                  <th className="px-4 py-3 text-left font-medium">Chương</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3" style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(m => {
                  const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.ongoing
                  return (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <div className="flex size-9 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: m.bg }}>
                          {m.initials}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{m.author}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(m.genre ?? []).slice(0, 2).map(g => (
                            <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">{m.chapters}</td>
                      <td className="px-4 py-2">
                        <Badge className={st.class} variant="secondary">{st.label}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setSelected(m)}>
                            <Eye className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setModal(m)}>
                            <Edit className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Search className="size-8 opacity-30" />
                <p className="mt-2 text-sm">Không tìm thấy kết quả</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {selected ? (
        <MangaDrawer
          manga={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setModal(selected); setSelected(null) }}
          onDelete={() => handleDelete(selected.id)}
        />
      ) : null}

      <MangaDialog manga={modal?.id ? modal : null} open={modal !== null} onClose={() => setModal(null)} onSave={handleSave} />
    </div>
  )
}