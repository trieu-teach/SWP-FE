import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Calendar, FileText, Sparkles } from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { WorkspaceHero } from '@/components/layout/WorkspaceHero.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { getSession, logout } from '@/lib/auth.js'
import {
  LABEL_EDITOR_BOARD,
  LABEL_TANTOU_EDITOR,
  PATH_EDITOR_BOARD,
} from '@/constants/roleTerminology.js'
import { readEbDebutApproved } from '@/utils/ebDebutStorage.js'
import {
  applyScheduleForEbApprovedSeries,
  approveRecurringSubmission,
  forwardSubmissionToEb,
  isSeriesEbApproved,
  listPublishSchedules,
  listTantouSubmissions,
  rejectSubmissionToMangaka,
  seedTantouDemoIfEmpty,
  suggestPublishCadence,
  syncAllTantouStatusFromEbDecisions,
  updateTantouSubmission,
} from '@/utils/tantouWorkspaceStorage.js'
import TantouPageReview from './TantouPageReview.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/mangaka', label: 'Mangaka' },
  { to: PATH_EDITOR_BOARD, label: LABEL_EDITOR_BOARD },
]

function statusVariant(status) {
  if (status === 'pending') return 'secondary'
  if (status === 'forwarded_eb') return 'default'
  if (status === 'eb_approved') return 'default'
  if (status === 'eb_rejected') return 'destructive'
  if (status === 'revision') return 'destructive'
  return 'outline'
}

function statusLabel(status) {
  const map = {
    pending: 'Chờ duyệt',
    revision: 'Đã gửi chỉnh',
    forwarded_eb: `Đã chuyển ${LABEL_EDITOR_BOARD}`,
    eb_approved: `${LABEL_EDITOR_BOARD} đã chấp nhận`,
    eb_rejected: `${LABEL_EDITOR_BOARD} đã từ chối`,
    approved_publish: 'Đã duyệt phát hành',
  }
  return map[status] ?? status
}

function SubmissionCard({ sub, onReview, onQuickApprove, showQuickApprove }) {
  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
          {sub.mangakaImageUrl ? (
            <img src={sub.mangakaImageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl">📄</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{sub.seriesTitle}</h3>
            <Badge variant={statusVariant(sub.status)}>{statusLabel(sub.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Ch. {sub.chapterNum} · {sub.pageLabel} · {sub.mangakaName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onReview(sub)}>
            Mở & nhận xét
          </Button>
          {showQuickApprove && sub.status === 'pending' ? (
            <Button size="sm" onClick={() => onQuickApprove(sub.id)}>
              Duyệt nhanh
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TantouEditor() {
  const navigate = useNavigate()
  const user = getSession()
  const [tab, setTab] = useState('debut')
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [editorialComment, setEditorialComment] = useState('')

  const refresh = useCallback(() => setTick(n => n + 1), [])

  useEffect(() => {
    seedTantouDemoIfEmpty()
    refresh()
  }, [refresh])

  useEffect(() => {
    // FIX #2: mỗi khi EB duyệt/từ chối, đồng bộ lại status các submission
    // đang "forwarded_eb" để không bị kẹt trạng thái cũ.
    const onEbSync = () => {
      syncAllTantouStatusFromEbDecisions()
      refresh()
    }
    const onSync = () => refresh()
    window.addEventListener('mk-tantou-storage', onSync)
    window.addEventListener('mk-eb-approved-update', onEbSync)
    window.addEventListener('mk-eb-rejected-update', onEbSync)
    return () => {
      window.removeEventListener('mk-tantou-storage', onSync)
      window.removeEventListener('mk-eb-approved-update', onEbSync)
      window.removeEventListener('mk-eb-rejected-update', onEbSync)
    }
  }, [refresh])

  const submissions = useMemo(() => listTantouSubmissions(), [tick])
  const schedules = useMemo(() => listPublishSchedules(), [tick])
  const ebApproved = useMemo(() => readEbDebutApproved(), [tick])

  const selected = useMemo(
    () => submissions.find(s => s.id === selectedId) ?? null,
    [submissions, selectedId],
  )

  const debutQueue = useMemo(
    () => submissions.filter(s => s.pipeline === 'debut' && s.status !== 'approved_publish'),
    [submissions],
  )

  const recurringQueue = useMemo(
    () =>
      submissions.filter(
        s => (s.pipeline === 'recurring' || isSeriesEbApproved(s.seriesTitle)) && s.status === 'pending',
      ),
    [submissions, tick],
  )

  const scheduleSeries = useMemo(() => {
    const titles = new Set([
      ...Object.keys(ebApproved).filter(t => ebApproved[t]),
      ...submissions.filter(s => s.status === 'forwarded_eb' || s.status === 'eb_approved').map(s => s.seriesTitle),
    ])
    return [...titles].map(title => {
      const sub = submissions.find(s => s.seriesTitle === title)
      const sched = schedules[title]
      const q = sub?.qualityScore ?? 70
      const p = sub?.popularityScore ?? 65
      return {
        title,
        qualityScore: q,
        popularityScore: p,
        suggested: suggestPublishCadence(q, p),
        cadence: sched?.cadence ?? sub?.publishCadence,
        label: sched?.label,
      }
    })
  }, [ebApproved, submissions, schedules])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function openReview(sub) {
    setSelectedId(sub.id)
    setEditorialComment(sub.editorialComment ?? '')
    setReviewOpen(true)
  }

  function closeReview() {
    setReviewOpen(false)
    if (selectedId) {
      updateTantouSubmission(selectedId, { editorialComment })
    }
    refresh()
  }

  function handleForwardEb() {
    if (!selectedId) return
    forwardSubmissionToEb(selectedId)
    toast.success(`Đã chuyển "${selected?.seriesTitle}" sang ${LABEL_EDITOR_BOARD}.`)
    setReviewOpen(false)
    refresh()
  }

  function handleReject() {
    if (!selectedId) return
    try {
      rejectSubmissionToMangaka(selectedId, { editorialComment, reviewNotes: {} })
    } catch (err) {
      toast.error(err.message || 'Nhập nhận xét trước khi gửi Mangaka chỉnh.')
      return
    }
    toast.success('Đã gửi nhận xét — Mangaka chỉnh và gửi lại.')
    setReviewOpen(false)
    refresh()
  }

  function handleApproveRecurring(id) {
    approveRecurringSubmission(id ?? selectedId)
    toast.success('Chapter đã duyệt — sẵn sàng phát hành.')
    if (!id) setReviewOpen(false)
    refresh()
  }

  function handleSetSchedule(title, q, p, cadence) {
    applyScheduleForEbApprovedSeries(title, q, p, cadence)
    toast.success(`Đã đặt lịch ${title}.`)
    refresh()
  }

  // ── Review mode — không có Footer để sticky bar không bị che ──
  if (reviewOpen && selected) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />
        <main className="page-container flex-1 py-8">
          <TantouPageReview
            submission={selected}
            editorialComment={editorialComment}
            onEditorialCommentChange={setEditorialComment}
            onBack={closeReview}
            onForwardEb={handleForwardEb}
            onReject={handleReject}
            onApproveRecurring={() => handleApproveRecurring()}
          />
        </main>
        {/* Footer bị bỏ ở đây để sticky bar hiện đúng */}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />

      <WorkspaceHero
        className="from-sky-950 to-zinc-950"
        label={LABEL_TANTOU_EDITOR}
        title={`Xin chào${user?.name ? `, ${user.name}` : ''}`}
        description={`Nhận bản thảo từ Mangaka · viết nhận xét · chuyển ${LABEL_EDITOR_BOARD} hoặc duyệt phát hành.`}
      />

      <main className="page-container flex-1 py-8">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="debut" className="gap-2">
              <Sparkles className="size-4" />
              Lần đầu → EB
            </TabsTrigger>
            <TabsTrigger value="recurring" className="gap-2">
              <FileText className="size-4" />
              Duyệt phát hành
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="size-4" />
              Lịch xuất bản
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debut" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Bản thảo lần đầu</h2>
                  <p className="text-sm text-muted-foreground">
                    Xét chuyển {LABEL_EDITOR_BOARD} hoặc gửi Mangaka chỉnh (kèm nhận xét).
                  </p>
                </div>
                {debutQueue.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Không có hàng chờ.
                    </CardContent>
                  </Card>
                ) : (
                  debutQueue.map(sub => (
                    <SubmissionCard
                      key={sub.id}
                      sub={sub}
                      onReview={openReview}
                      onQuickApprove={handleApproveRecurring}
                    />
                  ))
                )}
              </div>
              <SidebarFlow />
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Chapter chờ duyệt</h2>
              <p className="text-sm text-muted-foreground">Series đã qua EB — chỉ cần Tantou duyệt.</p>
            </div>
            {recurringQueue.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Không có hàng chờ.
                </CardContent>
              </Card>
            ) : (
              recurringQueue.map(sub => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  onReview={openReview}
                  onQuickApprove={handleApproveRecurring}
                  showQuickApprove
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Lịch phát hành</h2>
              <p className="text-sm text-muted-foreground">
                Series đã được {LABEL_EDITOR_BOARD} chấp nhận.
              </p>
            </div>
            {scheduleSeries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Chưa có series qua {LABEL_EDITOR_BOARD}.
                </CardContent>
              </Card>
            ) : (
              scheduleSeries.map(row => (
                <Card key={row.title}>
                  <CardHeader>
                    <CardTitle>{row.title}</CardTitle>
                    <CardDescription>
                      Chất lượng {row.qualityScore}% · Độ nổi {row.popularityScore}%
                      {' · Gợi ý: '}
                      {row.suggested === 'weekly' ? 'Theo tuần' : row.suggested === 'biweekly' ? '2 tuần/lần' : 'Theo tháng'}
                      {row.label ? ` · Đang: ${row.label}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="gap-2">
                    <Button
                      variant={row.cadence === 'weekly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetSchedule(row.title, row.qualityScore, row.popularityScore, 'weekly')}
                    >
                      Theo tuần
                    </Button>
                    <Button
                      variant={row.cadence === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetSchedule(row.title, row.qualityScore, row.popularityScore, 'monthly')}
                    >
                      Theo tháng
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  )
}

function SidebarFlow() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Luồng công việc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Lần đầu</p>
          <p>Mangaka → Assistant → Mangaka → Tantou → {LABEL_EDITOR_BOARD}</p>
        </div>
        <Separator />
        <div>
          <p className="font-medium text-foreground">Lần 2+</p>
          <p>Mangaka → chỉ Tantou duyệt → phát hành</p>
        </div>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link to={PATH_EDITOR_BOARD}>Mở {LABEL_EDITOR_BOARD} →</Link>
        </Button>
        <Separator />
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-destructive hover:text-destructive"
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
        >
          Reset demo (xóa localStorage)
        </Button>
      </CardContent>
    </Card>
  )
}