import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Calendar, FileText, Loader2, Sparkles } from 'lucide-react'
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
import axiosClient from '@/api/axiosClient.js'
import TantouPageReview from './TantouPageReview.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/mangaka', label: 'Mangaka' },
  { to: PATH_EDITOR_BOARD, label: LABEL_EDITOR_BOARD },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusVariant(status) {
  const map = {
    Submitted: 'secondary',
    UnderReview: 'default',
    Approved: 'default',
    Rejected: 'destructive',
  }
  return map[status] ?? 'outline'
}

function statusLabel(status) {
  const map = {
    Submitted: 'Chờ duyệt',
    UnderReview: `Đang xét ${LABEL_EDITOR_BOARD}`,
    Approved: 'Đã duyệt',
    Rejected: 'Đã từ chối',
  }
  return map[status] ?? status
}

function suggestPublishCadence(status) {
  if (status === 'Approved') return 'weekly'
  return 'monthly'
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SubmissionCard({ sub, onReview, onQuickApprove, showQuickApprove }) {
  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
          {sub.coverimageurl ? (
            <img src={sub.coverimageurl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl">📄</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{sub.title}</h3>
            <Badge variant={statusVariant(sub.status)}>{statusLabel(sub.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {sub.publishformat} · {sub.agerating}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onReview(sub)}>
            Mở & nhận xét
          </Button>
          {showQuickApprove && sub.status === 'Submitted' ? (
            <Button size="sm" onClick={() => onQuickApprove(sub.seriesid)}>
              Duyệt nhanh
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TantouEditor() {
  const navigate = useNavigate()
  const user = getSession()

  const [tab, setTab] = useState('debut')
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [editorialComment, setEditorialComment] = useState('')
  const [schedules, setSchedules] = useState({}) // { [seriesid]: 'weekly' | 'monthly' }

  // ── Load danh sách series từ API ──────────────────────────────────────────
  const loadSeries = useCallback(async () => {
    setLoading(true)
    try {
      // Lấy series chờ duyệt (Submitted + UnderReview)
      const [ebRes, allRes] = await Promise.allSettled([
        axiosClient.get('/Submissions/eb'),
        axiosClient.get('/Series'),
      ])

      const ebData = ebRes.status === 'fulfilled'
        ? (Array.isArray(ebRes.value.data) ? ebRes.value.data : (ebRes.value.data?.data ?? []))
        : []

      const allData = allRes.status === 'fulfilled'
        ? (Array.isArray(allRes.value.data) ? allRes.value.data : (allRes.value.data?.data ?? []))
        : []

      // Lấy series Approved từ /api/Series, tránh trùng với ebData
      const ebIds = new Set(ebData.map(s => s.seriesid))
      const approvedData = allData.filter(s => s.status === 'Approved' && !ebIds.has(s.seriesid))

      setSeries([...ebData, ...approvedData])
    } catch {
      // axiosClient interceptor đã toast lỗi
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSeries() }, [loadSeries])

  // ── Derived lists ─────────────────────────────────────────────────────────
  // Tab "Lần đầu → EB": series Submitted hoặc UnderReview
  const debutQueue = useMemo(
    () => series.filter(s => s.status === 'Submitted' || s.status === 'UnderReview'),
    [series],
  )

  // Tab "Duyệt phát hành": series Approved (đã qua EB)
  const recurringQueue = useMemo(
    () => series.filter(s => s.status === 'Approved'),
    [series],
  )

  // Tab "Lịch xuất bản": series Approved
  const scheduleSeries = useMemo(
    () => series
      .filter(s => s.status === 'Approved')
      .map(s => ({
        ...s,
        cadence: schedules[s.seriesid] ?? 'weekly',
        suggested: suggestPublishCadence(s.status),
      })),
    [series, schedules],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleLogout() {
    logout()
    navigate('/login')
  }

  function openReview(sub) {
    setSelectedSub(sub)
    setEditorialComment('')
    setReviewOpen(true)
  }

  function closeReview() {
    setReviewOpen(false)
    setSelectedSub(null)
    loadSeries()
  }

  // Chuyển sang EB: đổi status → UnderReview
  async function handleForwardEb() {
    if (!selectedSub) return
    try {
      await axiosClient.patch(`/Series/${selectedSub.seriesid}/status`, { status: 'UnderReview' })
      toast.success(`Đã chuyển "${selectedSub.title}" sang ${LABEL_EDITOR_BOARD}.`)
      setReviewOpen(false)
      loadSeries()
    } catch { /* interceptor toast */ }
  }

  // Từ chối về Mangaka: đổi status → Rejected
  async function handleReject() {
    if (!selectedSub) return
    if (!editorialComment.trim()) {
      toast.error('Nhập nhận xét trước khi gửi Mangaka chỉnh.')
      return
    }
    try {
      await axiosClient.patch(`/Series/${selectedSub.seriesid}/status`, { status: 'Rejected' })
      toast.success('Đã từ chối — Mangaka chỉnh và gửi lại.')
      setReviewOpen(false)
      loadSeries()
    } catch { /* interceptor toast */ }
  }

  // Duyệt nhanh chapter (series đã qua EB): đổi status → Approved
  async function handleApproveRecurring(seriesId) {
    const id = seriesId ?? selectedSub?.seriesid
    if (!id) return
    try {
      await axiosClient.patch(`/Series/${id}/status`, { status: 'Approved' })
      toast.success('Chapter đã duyệt — sẵn sàng phát hành.')
      setReviewOpen(false)
      loadSeries()
    } catch { /* interceptor toast */ }
  }

  function handleSetSchedule(seriesid, cadence) {
    setSchedules(prev => ({ ...prev, [seriesid]: cadence }))
    toast.success('Đã đặt lịch phát hành.')
  }

  // ── Review mode ───────────────────────────────────────────────────────────
  if (reviewOpen && selectedSub) {
    // Map API data → shape TantouPageReview expects
    const submission = {
      id: selectedSub.seriesid,
      seriesTitle: selectedSub.title,
      chapterNum: '—',
      pageLabel: selectedSub.publishformat ?? '—',
      mangakaImageUrl: selectedSub.coverimageurl ?? null,
      mangakaNotes: [],
      pipeline: selectedSub.status === 'Approved' ? 'recurring' : 'debut',
      status: selectedSub.status,
      editorialComment,
    }
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />
        <main className="page-container flex-1 py-8">
          <TantouPageReview
            submission={submission}
            editorialComment={editorialComment}
            onEditorialCommentChange={setEditorialComment}
            onBack={closeReview}
            onForwardEb={handleForwardEb}
            onReject={handleReject}
            onApproveRecurring={() => handleApproveRecurring()}
          />
        </main>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
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

          {/* ── Tab: Lần đầu → EB ── */}
          <TabsContent value="debut" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Bản thảo lần đầu</h2>
                  <p className="text-sm text-muted-foreground">
                    Xét chuyển {LABEL_EDITOR_BOARD} hoặc gửi Mangaka chỉnh (kèm nhận xét).
                  </p>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />Đang tải...
                  </div>
                ) : debutQueue.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Không có hàng chờ.
                    </CardContent>
                  </Card>
                ) : (
                  debutQueue.map(sub => (
                    <SubmissionCard
                      key={sub.seriesid}
                      sub={sub}
                      onReview={openReview}
                      onQuickApprove={handleApproveRecurring}
                    />
                  ))
                )}
              </div>
              <SidebarFlow onRefresh={loadSeries} />
            </div>
          </TabsContent>

          {/* ── Tab: Duyệt phát hành ── */}
          <TabsContent value="recurring" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Chapter chờ duyệt</h2>
              <p className="text-sm text-muted-foreground">Series đã qua EB — chỉ cần Tantou duyệt.</p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />Đang tải...
              </div>
            ) : recurringQueue.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Không có hàng chờ.
                </CardContent>
              </Card>
            ) : (
              recurringQueue.map(sub => (
                <SubmissionCard
                  key={sub.seriesid}
                  sub={sub}
                  onReview={openReview}
                  onQuickApprove={handleApproveRecurring}
                  showQuickApprove
                />
              ))
            )}
          </TabsContent>

          {/* ── Tab: Lịch xuất bản ── */}
          <TabsContent value="schedule" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Lịch phát hành</h2>
              <p className="text-sm text-muted-foreground">
                Series đã được {LABEL_EDITOR_BOARD} chấp nhận.
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />Đang tải...
              </div>
            ) : scheduleSeries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Chưa có series qua {LABEL_EDITOR_BOARD}.
                </CardContent>
              </Card>
            ) : (
              scheduleSeries.map(row => (
                <Card key={row.seriesid}>
                  <CardHeader>
                    <CardTitle>{row.title}</CardTitle>
                    <CardDescription>
                      {row.publishformat} · {row.agerating}
                      {' · Gợi ý: '}
                      {row.suggested === 'weekly' ? 'Theo tuần' : 'Theo tháng'}
                      {row.cadence ? ` · Đang: ${row.cadence === 'weekly' ? 'Theo tuần' : 'Theo tháng'}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="gap-2">
                    <Button
                      variant={row.cadence === 'weekly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetSchedule(row.seriesid, 'weekly')}
                    >
                      Theo tuần
                    </Button>
                    <Button
                      variant={row.cadence === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetSchedule(row.seriesid, 'monthly')}
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

function SidebarFlow({ onRefresh }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Luồng công việc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Lần đầu</p>
          <p>Mangaka → Tantou → {LABEL_EDITOR_BOARD}</p>
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
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
        >
          Tải lại dữ liệu
        </Button>
      </CardContent>
    </Card>
  )
}