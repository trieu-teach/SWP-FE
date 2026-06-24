import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Handshake,
  Image as ImageIcon,
  Inbox,
  Layers as LayersIcon,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { WorkspaceHero } from '@/components/layout/WorkspaceHero.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getSession, logout } from '@/lib/auth.js'
import { useAssistantAssignments } from '@/hooks/useAssistantAssignments.js'
import { useCollaborationRequests } from '@/hooks/useCollaborationRequests.js'
import LayerEditor from '@/components/layer/LayerEditor.jsx'

const NAV_LINKS = [{ to: '/', label: 'Trang chủ' }]

const STATS = [
  { label: 'Chapter nhận', icon: Inbox, color: 'amber' },
  { label: 'Đang làm', icon: LayersIcon, color: 'violet' },
  { label: 'Chờ duyệt', icon: Clock, color: 'sky' },
  { label: 'Đã duyệt', icon: CheckCircle2, color: 'emerald' },
  { label: 'Thu nhập', icon: TrendingUp, color: 'rose' },
]

const STATUS_BADGE = {
  Drafting: { label: 'Đang soạn', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  StudioWorking: { label: 'Studio làm', className: 'bg-violet-100 text-violet-700 hover:bg-violet-100' },
  MangakaReview: { label: 'Chờ Mangaka duyệt', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
  Approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  Revision: { label: 'Cần sửa', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  pending: { label: 'Chờ nhận', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  in_progress: { label: 'Đang xử lý', className: 'bg-violet-100 text-violet-700 hover:bg-violet-100' },
  submitted: { label: 'Đã gửi', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
  approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  revision: { label: 'Cần sửa', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
}

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ nhận' },
  { id: 'in_progress', label: 'Đang làm' },
  { id: 'submitted', label: 'Đã gửi' },
  { id: 'approved', label: 'Đã xong' },
  { id: 'revision', label: 'Bị từ chối' },
]

export default function Assistant() {
  const navigate = useNavigate()
  const session = getSession()
  const user = session ?? {}

  const { assignments, loading: assignmentsLoading, refresh } = useAssistantAssignments()
  const { pendingCount } = useCollaborationRequests()
  const [selectedChapterId, setSelectedChapterId] = useState(null)
  const [taskFilter, setTaskFilter] = useState('all')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const selectedAssignment = useMemo(
    () => assignments.find(a => a.chapterId === selectedChapterId) ?? assignments[0] ?? null,
    [assignments, selectedChapterId],
  )

  // Auto-select chapter đầu tiên
  useEffect(() => {
    if (!assignments.length) {
      setSelectedChapterId(null)
      return
    }
    if (!assignments.some(a => a.chapterId === selectedChapterId)) {
      setSelectedChapterId(assignments[0]?.chapterId ?? null)
    }
  }, [assignments, selectedChapterId])

  // ESC để thoát fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const filteredChapters = useMemo(() => {
    if (taskFilter === 'all') return assignments
    return assignments.filter(a => {
      const s = String(a.status ?? '').toLowerCase()
      return s === taskFilter
    })
  }, [assignments, taskFilter])

  const counts = useMemo(() => {
    const c = { all: assignments.length }
    for (const f of FILTERS) {
      if (f.id === 'all') continue
      c[f.id] = assignments.filter(a => String(a.status ?? '').toLowerCase() === f.id).length
    }
    return c
  }, [assignments])

  const statsDisplayed = useMemo(() => {
    const pending = assignments.filter(a => String(a.status).toLowerCase() === 'pending').length
    const progress = assignments.filter(a => String(a.status).toLowerCase() === 'in_progress').length
    const review = assignments.filter(a => String(a.status).toLowerCase() === 'submitted').length
    const approved = assignments.filter(a => String(a.status).toLowerCase() === 'approved').length
    return [
      { ...STATS[0], value: String(pending || assignments.length) },
      { ...STATS[1], value: String(progress) },
      { ...STATS[2], value: String(review) },
      { ...STATS[3], value: String(approved) },
      { ...STATS[4], value: '—' },
    ]
  }, [assignments])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleSelectChapter(chapter) {
    setSelectedChapterId(chapter.chapterId)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />

      <WorkspaceHero
        className="from-violet-950 to-zinc-950"
        label="Assistant Workspace"
        title={`Xin chào${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Nhận chapter từ Mangaka. Mỗi chapter = nhiều trang. Upload layer theo thứ tự, gộp và gửi."
      >
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-300">
          <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
            <LayersIcon className="size-3" />
            Layer Editor
          </Badge>
          <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
            Gộp & gửi cho Mangaka
          </Badge>
        </div>
      </WorkspaceHero>

      <main className="page-container flex-1 py-8">
        {/* Banner: cần sửa */}
        {(() => {
          const revisions = assignments.filter(a => String(a.status).toLowerCase() === 'revision')
          if (!revisions.length) return null
          return (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <AlertTriangle className="size-5 shrink-0 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {revisions.length} chapter bị từ chối — cần sửa lại
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70">
                  Xem ghi chú ở dưới editor, upload layer sửa rồi gộp & gửi lại.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-red-300 text-red-600 hover:bg-red-100"
                onClick={() => setTaskFilter('revision')}
              >
                Xem ngay
              </Button>
            </div>
          )
        })()}

        {/* Banner: có yêu cầu hợp tác */}
        {pendingCount > 0 && (
          <Card className="mb-6 border-violet-200 bg-gradient-to-br from-violet-500/5 via-background to-background">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Handshake className="size-4 text-violet-600" />
                {pendingCount} yêu cầu hợp tác mới
              </CardTitle>
              <CardDescription>
                Vào mục Hợp tác để đồng ý hoặc từ chối.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Main: 2 cột */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* LEFT: danh sách chapter */}
          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chapter được giao</CardTitle>
                <CardDescription>Chọn chapter để xử lý</CardDescription>
                <div className="-mb-1 mt-1 flex flex-wrap gap-1 pt-2">
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTaskFilter(f.id)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                        taskFilter === f.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                      )}
                    >
                      {f.label}
                      {counts[f.id] > 0 && (
                        <span className={cn(
                          'ml-1 rounded-full px-1 py-0.5 text-[10px] font-bold',
                          taskFilter === f.id
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {counts[f.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {assignmentsLoading ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">Đang tải…</div>
                ) : filteredChapters.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">Không có chapter nào.</div>
                ) : (
                  <ScrollArea className="max-h-[calc(100vh-320px)]">
                    <ul className="space-y-1 p-3 pt-0">
                      {filteredChapters.map(ch => {
                        const badge = STATUS_BADGE[ch.status] ?? STATUS_BADGE.pending
                        const cover = ch.pages?.find(p => p.url) ?? ch.pages?.[0]
                        const isSelected = ch.chapterId === selectedChapterId
                        return (
                          <li key={ch.chapterId ?? ch.contractId}>
                            <button
                              type="button"
                              onClick={() => handleSelectChapter(ch)}
                              className={cn(
                                'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors',
                                isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                              )}
                            >
                              <span className="shrink-0 size-12 overflow-hidden rounded border bg-muted">
                                {cover?.url ? (
                                  <img src={cover.url} alt="" className="size-full object-cover" />
                                ) : (
                                  <span className="flex size-full items-center justify-center text-muted-foreground">
                                    <ImageIcon className="size-4" />
                                  </span>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                  {ch.seriesTitle}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  Ch.{ch.chapterNum}{ch.title ? ` · ${ch.title}` : ''}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ch.pageCount ?? ch.pages?.length ?? 0} trang
                                </p>
                                <Badge className={cn('mt-1', badge.className)} variant="secondary">
                                  {badge.label}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-primary" />
                  Thống kê
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statsDisplayed.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('size-4', `text-${s.color}-500`)} />
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{s.value}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Process guide */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4 text-primary" />
                  Quy trình
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-2 border-l border-muted pl-5">
                  {[
                    'Chọn chapter bên trái',
                    'Chọn trang trong editor',
                    'Upload layer theo thứ tự (0, 1, 2...)',
                    'Điều chỉnh hiển thị / opacity',
                    'Bấm "Gộp layer" để xuất ảnh hoàn chỉnh',
                    'Bấm "Gửi Mangaka" khi đã xong tất cả trang',
                  ].map((text, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[26px] flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                        {i + 1}
                      </span>
                      <p className="text-xs text-muted-foreground">{text}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </aside>

          {/* RIGHT: Layer Editor */}
          <div className="flex min-h-[calc(100vh-200px)] flex-col">
            {selectedAssignment ? (
              <div className="relative flex h-full min-h-0 flex-col">
                <LayerEditor
                  chapter={{
                    seriesTitle: selectedAssignment.seriesTitle,
                    chapterNum: selectedAssignment.chapterNum,
                    chapterId: selectedAssignment.chapterId,
                    pages: (selectedAssignment.pages ?? []).map(p => ({
                      id: p.id,
                      url: p.url,
                      pageNum: p.pageNum,
                    })),
                  }}
                  onSubmitted={() => {
                    void refresh()
                    toast.success('Đã gửi chapter. Đang tải lại danh sách…')
                  }}
                />
              </div>
            ) : (
              <Card className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
                <ImageIcon className="size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Chọn một chapter bên trái để bắt đầu.
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload layer → Gộp → Gửi Mangaka
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
