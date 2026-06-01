import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  PartyPopper,
  Search,
  User,
} from 'lucide-react'
import { api } from '@/api/index.js'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const SEV_CLS = {
  high: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  low: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30',
}
const SEV_LABEL = { high: 'Nghiêm trọng', medium: 'Trung bình', low: 'Nhẹ' }
const STATUS_CLS = {
  pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400',
  reviewing: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-400',
  resolved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400',
}
const STATUS_LABEL = { pending: 'Chờ xử lý', reviewing: 'Đang xem xét', resolved: 'Đã xử lý' }

const RESOLUTIONS = [
  { value: 'warn', label: 'Cảnh cáo người dùng', desc: 'Gửi email cảnh báo về hành vi vi phạm' },
  { value: 'ban7', label: 'Khoá 7 ngày', desc: 'Tạm khoá tài khoản trong 7 ngày' },
  { value: 'ban30', label: 'Khoá 30 ngày', desc: 'Tạm khoá tài khoản trong 30 ngày' },
  { value: 'remove', label: 'Xoá nội dung', desc: 'Xoá nội dung vi phạm và thông báo' },
  { value: 'ignore', label: 'Bỏ qua', desc: 'Báo cáo không hợp lệ, không có hành động' },
]

function ResolveDialog({ report, open, onClose, onResolve }) {
  const [pick, setPick] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPick('')
      setNote('')
    }
  }, [open])

  async function handleResolve() {
    if (!pick) return
    setSaving(true)
    const res = RESOLUTIONS.find(r => r.value === pick)
    await onResolve(report.id, { resolution: res.label + (note ? ` — ${note}` : '') })
    setSaving(false)
    onClose()
  }

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Xử lý báo cáo {report.id}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Hành động xử lý</Label>
            <div className="space-y-2">
              {RESOLUTIONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setPick(r.value)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                    pick === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 size-4 shrink-0 rounded-full border-2 transition-colors',
                      pick === r.value ? 'border-primary bg-primary' : 'border-input',
                    )}
                  >
                    {pick === r.value ? <span className="block size-full rounded-full ring-4 ring-inset ring-card" /> : null}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ghi chú (tuỳ chọn)</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú thêm về quyết định xử lý..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleResolve} disabled={!pick || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? 'Đang xử lý...' : 'Xác nhận xử lý'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Reports() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)

  useEffect(() => {
    api.getReports().then(d => { setList(d); setLoading(false) })
  }, [])

  async function handleResolve(id, data) {
    await api.resolveReport(id, data)
    setList(l => l.map(r => r.id === id ? { ...r, status: 'resolved', ...data } : r))
  }

  const filtered = list.filter(r => filter === 'all' || r.status === filter)
  const counts = {
    pending: list.filter(r => r.status === 'pending').length,
    reviewing: list.filter(r => r.status === 'reviewing').length,
    resolved: list.filter(r => r.status === 'resolved').length,
  }

  const statCards = [
    { key: 'pending', label: 'Chờ xử lý', icon: Clock, color: 'amber' },
    { key: 'reviewing', label: 'Đang xem xét', icon: Search, color: 'sky' },
    { key: 'resolved', label: 'Đã xử lý', icon: CheckCircle2, color: 'emerald' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo cáo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.pending} báo cáo đang chờ xử lý
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <Card key={s.key}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <div className="text-3xl font-bold tracking-tight">{counts[s.key]}</div>
                </div>
                <div className={cn(
                  'flex size-11 items-center justify-center rounded-xl',
                  s.color === 'amber' && 'bg-amber-500/10 text-amber-600',
                  s.color === 'sky' && 'bg-sky-500/10 text-sky-600',
                  s.color === 'emerald' && 'bg-emerald-500/10 text-emerald-600',
                )}>
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-md border bg-card p-1 w-fit">
        {[
          { v: 'all', label: 'Tất cả' },
          { v: 'pending', label: STATUS_LABEL.pending },
          { v: 'reviewing', label: STATUS_LABEL.reviewing },
          { v: 'resolved', label: STATUS_LABEL.resolved },
        ].map(f => (
          <Button
            key={f.v}
            size="sm"
            variant={filter === f.v ? 'secondary' : 'ghost'}
            onClick={() => setFilter(f.v)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-7 animate-spin" />
          <p className="mt-3 text-sm">Đang tải...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
            <PartyPopper className="size-10 opacity-40" />
            <p className="mt-3 text-sm">Không có báo cáo nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                    <Flag className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{r.type}</h3>
                      <span className="text-xs text-muted-foreground">{r.id}</span>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-medium', SEV_CLS[r.severity])}>
                        <AlertTriangle className="mr-1 inline size-2.5" />
                        {SEV_LABEL[r.severity]}
                      </span>
                      <Badge className={STATUS_CLS[r.status]} variant="secondary">{STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="size-3.5" />
                    {r.reporter} <ArrowRight className="size-3" /> {r.target}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{r.createdAt}</span>
                    {r.status !== 'resolved' ? (
                      <Button size="sm" onClick={() => setModal(r)}>
                        Xử lý <ArrowRight className="size-3.5" />
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="size-3.5" />
                        {r.resolution}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResolveDialog report={modal} open={modal !== null} onClose={() => setModal(null)} onResolve={handleResolve} />
    </div>
  )
}
