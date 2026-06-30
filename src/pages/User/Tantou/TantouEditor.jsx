import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Calendar, Clock, Loader2, Search, Sparkles, X } from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { WorkspaceHero } from '@/components/layout/WorkspaceHero.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { getSession, logout } from '@/lib/auth.js'
import {
  LABEL_EDITOR_BOARD,
  LABEL_TANTOU_EDITOR,
  PATH_EDITOR_BOARD,
} from '@/constants/roleTerminology.js'
import axiosClient from '@/api/axiosClient.js'
import { useChapters, usePages } from '@/api/hooks'
import TantouPageReview from './TantouPageReview.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/mangaka', label: 'Mangaka' },
  { to: PATH_EDITOR_BOARD, label: LABEL_EDITOR_BOARD },
]

// ── Status helpers ────────────────────────────────────────────────────────────
function normalizeStatus(raw) {
  return (raw ?? '').toLowerCase().replace(/[_\s-]/g, '')
}

const DEBUT_STATUSES   = new Set(['draft', 'editorreview', 'submitted'])
const APPROVED_STATUSES = new Set(['approved', 'publishing'])
const EB_STATUSES      = new Set(['ebreview', 'underreview'])

function isDebutStatus(raw)    { return DEBUT_STATUSES.has(normalizeStatus(raw)) }
function isApprovedStatus(raw) { return APPROVED_STATUSES.has(normalizeStatus(raw)) }
function isEbStatus(raw)       { return EB_STATUSES.has(normalizeStatus(raw)) }

function statusVariant(raw) {
  const s = normalizeStatus(raw)
  if (s === 'draft')                             return 'outline'
  if (s === 'submitted' || s === 'editorreview') return 'secondary'
  if (s === 'ebreview'  || s === 'underreview')  return 'default'
  if (s === 'publishing' || s === 'approved')    return 'default'
  if (s === 'rejected'  || s === 'cancelled')    return 'destructive'
  if (s === 'inproduction')                      return 'secondary'
  if (s === 'ready')                             return 'default'
  if (s === 'published')                         return 'outline'
  if (s === 'delayed')                           return 'destructive'
  return 'outline'
}

function statusLabel(raw) {
  const map = {
    draft:        'Bản nháp',
    submitted:    'Chờ duyệt',
    editorreview: 'Tantou đang xét',
    ebreview:     `Đang xét ${LABEL_EDITOR_BOARD}`,
    underreview:  `Đang xét ${LABEL_EDITOR_BOARD}`,
    publishing:   'Đang phát hành',
    approved:     'Đã duyệt',
    completed:    'Hoàn thành',
    rejected:     'Đã từ chối',
    cancelled:    'Đã huỷ',
    inproduction: 'Đang thực hiện',
    ready:        'Sẵn sàng — chờ EB',
    published:    'Đã phát hành',
    delayed:      'Trễ deadline',
  }
  return map[normalizeStatus(raw)] ?? raw
}

function cadenceFromFormat(raw) {
  const f = normalizeStatus(raw)
  if (f === 'weekly')  return 'weekly'
  if (f === 'monthly') return 'monthly'
  return null
}

function handleCoverImgError(e) {
  e.currentTarget.style.display = 'none'
  e.currentTarget.nextElementSibling?.classList.remove('hidden')
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CoverThumb({ url, sizeClass = 'size-16 sm:size-20' }) {
  return (
    <div className={`flex ${sizeClass} shrink-0 overflow-hidden rounded-lg bg-muted`}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" onError={handleCoverImgError} />
      ) : null}
      <div className={`flex size-full items-center justify-center text-2xl ${url ? 'hidden' : ''}`}>
        📄
      </div>
    </div>
  )
}

function SubmissionCard({ sub, onReview }) {
  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <CoverThumb url={sub.coverimageurl} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{sub.title}</h3>
            <Badge variant={statusVariant(sub.status)}>{statusLabel(sub.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {sub.publishformat} · {sub.agerating}
          </p>
          {sub.synopsis && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{sub.synopsis}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => onReview(sub)}>
          Mở & nhận xét
        </Button>
      </CardContent>
    </Card>
  )
}

// Chỉ xem — Tantou không duyệt chapter, quyền đó thuộc EB
function StudioChapterCard({ item }) {
  const s         = item.seriesInfo
  const st        = normalizeStatus(item.status)
  const isDelayed = st === 'delayed'
  const isReady   = st === 'ready'

  return (
    <Card className={`transition-all ${isDelayed ? 'border-destructive/50' : ''}`}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <CoverThumb url={s?.coverimageurl} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s?.title ?? `Series #${item.seriesid}`}</h3>
            <Badge variant="secondary">Ch.{item.chapternumber}</Badge>
            <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
          </div>
          {item.title && (
            <p className="text-sm text-muted-foreground">{item.title}</p>
          )}
          {item.deadline && (
            <p className={`text-xs ${isDelayed ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
              Deadline: {new Date(item.deadline).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>
        {isReady && (
          <p className="shrink-0 text-xs text-muted-foreground">Chờ {LABEL_EDITOR_BOARD} duyệt</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TantouEditor() {
  const navigate = useNavigate()
  const user = getSession()

  const [tab, setTab] = useState('debut')

  // Series
  const [loading, setLoading]   = useState(true)
  const [series, setSeries]     = useState([])

  // Studio chapters — load sau khi series đã xong (cần seriesById để filter)
  const [studioLoading, setStudioLoading]     = useState(false)
  const [studioChapters, setStudioChapters]   = useState([])

  // Review
  const [selectedSub, setSelectedSub]           = useState(null)
  const [reviewOpen, setReviewOpen]             = useState(false)
  const [editorialComment, setEditorialComment] = useState('')
  const [reviewPageIndex, setReviewPageIndex]   = useState(0)

  // Studio filter
  const [studioSearch, setStudioSearch]     = useState('')
  const [studioStatusFilter, setStudioStatusFilter] = useState('all')

  // Schedule save
  const [savingScheduleId, setSavingScheduleId] = useState(null)

  // ── Load series ───────────────────────────────────────────────────────────
  const loadSeries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axiosClient.get('/Series')
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      const active = raw.filter(s => {
        const st = normalizeStatus(s.status)
        return st !== 'cancelled' && st !== 'completed'
      })
      setSeries(active)
    } catch { /* interceptor toast */ }
    finally { setLoading(false) }
  }, [])

  // ── Load chapter studio (phụ thuộc seriesById) ────────────────────────────
  const loadStudioChapters = useCallback(async (seriesMap) => {
    if (seriesMap.size === 0) return
    setStudioLoading(true)
    try {
      const res = await axiosClient.get('/Chapters')
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      const active = raw.filter(ch => {
        const st = normalizeStatus(ch.status)
        return (
          seriesMap.has(ch.seriesid) &&
          st !== 'draft' &&
          st !== 'cancelled'
        )
      })
      setStudioChapters(active)
    } catch { /* interceptor toast */ }
    finally { setStudioLoading(false) }
  }, [])

  useEffect(() => { loadSeries() }, [loadSeries])

  useEffect(() => {
    if (loading) return
    const map = new Map()
    series.forEach(s => map.set(s.seriesid, s))
    loadStudioChapters(map)
  }, [loading, series, loadStudioChapters])

  // ── Derived ───────────────────────────────────────────────────────────────
  const seriesById = useMemo(() => {
    const map = new Map()
    series.forEach(s => map.set(s.seriesid, s))
    return map
  }, [series])

  const debutQueue = useMemo(
    () => series.filter(s => isDebutStatus(s.status)),
    [series],
  )

  const ebQueue = useMemo(
    () => series.filter(s => isEbStatus(s.status)),
    [series],
  )

  const scheduleSeries = useMemo(
    () => series
      .filter(s => isApprovedStatus(s.status))
      .map(s => ({ ...s, cadence: cadenceFromFormat(s.publishformat) })),
    [series],
  )

  const studioQueue = useMemo(
    () => studioChapters.map(ch => ({
      ...ch,
      seriesInfo: seriesById.get(ch.seriesid) ?? null,
    })),
    [studioChapters, seriesById],
  )

  const filteredStudioQueue = useMemo(() => {
    const q = studioSearch.trim().toLowerCase()
    return studioQueue.filter(ch => {
      const matchStatus = studioStatusFilter === 'all' || normalizeStatus(ch.status) === studioStatusFilter
      const seriesTitle = (ch.seriesInfo?.title ?? '').toLowerCase()
      const chapterTitle = (ch.title ?? '').toLowerCase()
      const matchSearch = !q || seriesTitle.includes(q) || chapterTitle.includes(q)
      return matchStatus && matchSearch
    })
  }, [studioQueue, studioSearch, studioStatusFilter])

  const delayedCount = useMemo(
    () => studioQueue.filter(ch => normalizeStatus(ch.status) === 'delayed').length,
    [studioQueue],
  )

  // ── Chapter + pages thật của series đang review ───────────────────────────
  // Chỉ fetch khi đang mở review (reviewOpen) để tránh gọi API thừa.
  const reviewSeriesId = reviewOpen ? selectedSub?.seriesid : undefined
  const { data: reviewChapters = [], isLoading: reviewChaptersLoading } = useChapters(reviewSeriesId)

  // Chapter đầu tiên (nhỏ nhất theo chapternumber) — đây là chapter Mangaka mới gửi lên
  const reviewChapter = useMemo(() => {
    if (!Array.isArray(reviewChapters) || reviewChapters.length === 0) return null
    return [...reviewChapters].sort((a, b) => {
      const an = a.chapternumber ?? a.Chapternumber ?? 0
      const bn = b.chapternumber ?? b.Chapternumber ?? 0
      return an - bn
    })[0]
  }, [reviewChapters])

  const reviewChapterId = reviewChapter
    ? (reviewChapter.chapterid ?? reviewChapter.Chapterid ?? reviewChapter.id)
    : undefined

  const { data: reviewPagesRaw = [], isLoading: reviewPagesLoading } = usePages(reviewChapterId)

  // Map về shape gọn cho TantouPageReview: { serverPageId, url, name }
  const reviewPages = useMemo(() => {
    if (!Array.isArray(reviewPagesRaw)) return []
    return reviewPagesRaw
      .filter(p => p && (p.pageimageurl ?? p.Pageimageurl))
      .sort((a, b) => (a.pagenumber ?? a.Pagenumber ?? 0) - (b.pagenumber ?? b.Pagenumber ?? 0))
      .map((p, i) => ({
        serverPageId: p.pageid ?? p.Pageid,
        url: p.pageimageurl ?? p.Pageimageurl,
        name: `Trang ${p.pagenumber ?? p.Pagenumber ?? i + 1}`,
      }))
  }, [reviewPagesRaw])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleLogout() {
    logout()
    navigate('/login')
  }

  function openReview(sub) {
    setSelectedSub({ ...sub, __kind: 'series' })
    setEditorialComment('')
    setReviewPageIndex(0)
    setReviewOpen(true)
  }

  function closeReview() {
    setReviewOpen(false)
    setSelectedSub(null)
    loadSeries()
  }

  async function handleForwardEb() {
    if (!selectedSub) return
    try {
      await axiosClient.patch(`/Series/${selectedSub.seriesid}/status`, { status: 'EBReview' })
      toast.success(`Đã chuyển "${selectedSub.title}" sang ${LABEL_EDITOR_BOARD}.`)
      setReviewOpen(false)
      loadSeries()
    } catch { /* interceptor toast */ }
  }

  async function handleRequestRevision() {
    if (!selectedSub) return
    if (!editorialComment.trim()) {
      toast.error('Nhập ghi chú trước khi yêu cầu Mangaka chỉnh sửa.')
      return
    }
    try {
      await axiosClient.patch(`/Series/${selectedSub.seriesid}/request-revision`, {
        Comment: editorialComment.trim(),
      })
      toast.success('Đã gửi yêu cầu chỉnh sửa cho Mangaka.')
      setReviewOpen(false)
      loadSeries()
    } catch { /* interceptor toast */ }
  }

  async function handleSetSchedule(seriesid, cadence) {
    const publishformat = cadence === 'weekly' ? 'Weekly' : 'Monthly'
    setSavingScheduleId(seriesid)
    try {
      await axiosClient.patch(`/Series/${seriesid}/publish-format`, { Publishformat: publishformat })
      toast.success(`Đã đặt lịch ${cadence === 'weekly' ? 'theo tuần' : 'theo tháng'}.`)
      await loadSeries()
    } catch { /* interceptor toast */ }
    finally { setSavingScheduleId(null) }
  }

  function handleRefreshStudio() {
    const map = new Map()
    series.forEach(s => map.set(s.seriesid, s))
    loadStudioChapters(map)
  }

  // ── Review mode ───────────────────────────────────────────────────────────
  if (reviewOpen && selectedSub) {
    const isDebut = isDebutStatus(selectedSub.status) && !isApprovedStatus(selectedSub.status)
    const submission = {
      id:               selectedSub.seriesid,
      seriesTitle:      selectedSub.title,
      chapterNum:       reviewChapter
        ? (reviewChapter.chapternumber ?? reviewChapter.Chapternumber ?? '—')
        : '—',
      pageLabel:        selectedSub.publishformat ?? '—',
      // Ảnh bìa series — dùng làm fallback khi chapter chưa có trang nào
      mangakaImageUrl:  selectedSub.coverimageurl ?? null,
      mangakaNotes:     [],
      pipeline:         isDebut ? 'debut' : 'recurring',
      status:           selectedSub.status,
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
            onRequestRevision={handleRequestRevision}
            onApproveRecurring={undefined}
            // Trang truyện thật từ Chapters/Pages — cho phép Tantou vẽ ô ghi chú
            pages={reviewPages}
            pagesLoading={reviewChaptersLoading || reviewPagesLoading}
            pageIndex={reviewPageIndex}
            onPageIndexChange={setReviewPageIndex}
            chapterId={reviewChapterId}
            // Lịch sử nhận xét — chưa có API, để rỗng tạm thời
            revisionHistory={[]}
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
        description={`Nhận bản thảo từ Mangaka · viết nhận xét · chuyển ${LABEL_EDITOR_BOARD} · theo dõi tiến độ studio.`}
      />

      <main className="page-container flex-1 py-8">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="debut" className="gap-2">
              <Sparkles className="size-4" />
              Lần đầu → EB
              {(debutQueue.length + ebQueue.length) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {debutQueue.length + ebQueue.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="studio" className="gap-2">
              <Clock className="size-4" />
              Tiến độ studio
              {delayedCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                  {delayedCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="size-4" />
              Lịch xuất bản
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Lần đầu → EB ── */}
          <TabsContent value="debut" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">Bản thảo đang xét</h2>
                    <p className="text-sm text-muted-foreground">
                      Xét chuyển {LABEL_EDITOR_BOARD} hoặc gửi Mangaka chỉnh (kèm nhận xét).
                    </p>
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-2 py-8 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Đang tải...
                    </div>
                  ) : debutQueue.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        Không có bản thảo nào chờ Tantou xét.
                      </CardContent>
                    </Card>
                  ) : (
                    debutQueue.map(sub => (
                      <SubmissionCard key={sub.seriesid} sub={sub} onReview={openReview} />
                    ))
                  )}
                </div>

                {!loading && ebQueue.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
                        Đang xét tại {LABEL_EDITOR_BOARD}
                        <Badge variant="outline" className="text-[10px]">{ebQueue.length}</Badge>
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Đã chuyển EB — chờ kết quả. Tantou không cần action.
                      </p>
                    </div>
                    {ebQueue.map(sub => (
                      <Card key={sub.seriesid} className="opacity-70">
                        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                          <CoverThumb url={sub.coverimageurl} />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{sub.title}</h3>
                              <Badge variant="default">{statusLabel(sub.status)}</Badge>
                              {sub.agerating && (
                                <Badge variant="outline" className="text-[11px]">{sub.agerating}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{sub.publishformat}</p>
                            {sub.synopsis && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{sub.synopsis}</p>
                            )}
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground">Chờ EB duyệt</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <SidebarFlow onRefresh={loadSeries} />
            </div>
          </TabsContent>

          {/* ── Tab: Tiến độ studio ── */}
          <TabsContent value="studio" className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Tiến độ studio</h2>
                <p className="text-sm text-muted-foreground">
                  Theo dõi trạng thái chapter. Duyệt Ready → Published là quyền của {LABEL_EDITOR_BOARD}.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs text-muted-foreground"
                onClick={handleRefreshStudio}
                disabled={studioLoading}
              >
                {studioLoading
                  ? <Loader2 className="size-3 animate-spin" />
                  : <Clock className="size-3" />
                }
                <span className="ml-1">Làm mới</span>
              </Button>
            </div>

            {!studioLoading && delayedCount > 0 && (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="px-4 py-3 text-sm text-destructive">
                  ⚠️ {delayedCount} chương trễ deadline — liên hệ studio xử lý ngay.
                </CardContent>
              </Card>
            )}

            {!studioLoading && studioQueue.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm series hoặc tên chương..."
                    value={studioSearch}
                    onChange={e => setStudioSearch(e.target.value)}
                    className="h-8 pl-8 pr-8 text-sm"
                  />
                  {studioSearch && (
                    <button
                      onClick={() => setStudioSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  {[
                    { value: 'all',          label: 'Tất cả' },
                    { value: 'inproduction', label: 'Đang làm' },
                    { value: 'delayed',      label: 'Trễ' },
                    { value: 'ready',        label: 'Sẵn sàng' },
                    { value: 'published',    label: 'Đã phát' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      variant={studioStatusFilter === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setStudioStatusFilter(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {studioLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Đang tải tiến độ...
              </div>
            ) : filteredStudioQueue.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {studioQueue.length === 0
                    ? 'Không có chapter nào đang trong pipeline.'
                    : 'Không tìm thấy chapter khớp bộ lọc.'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredStudioQueue.map(item => (
                  <StudioChapterCard key={item.chapterid} item={item} />
                ))}
                {filteredStudioQueue.length < studioQueue.length && (
                  <p className="text-center text-xs text-muted-foreground">
                    Hiện {filteredStudioQueue.length} / {studioQueue.length} chương
                  </p>
                )}
              </div>
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
                <Loader2 className="size-4 animate-spin" /> Đang tải...
              </div>
            ) : scheduleSeries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Chưa có series qua {LABEL_EDITOR_BOARD}.
                </CardContent>
              </Card>
            ) : (
              scheduleSeries.map(row => {
                const isSaving = savingScheduleId === row.seriesid
                return (
                  <Card key={row.seriesid}>
                    <CardHeader>
                      <CardTitle>{row.title}</CardTitle>
                      <CardDescription>
                        {row.agerating}
                        {row.cadence
                          ? ` · Đang phát hành: ${row.cadence === 'weekly' ? 'Theo tuần' : 'Theo tháng'}`
                          : ' · Chưa đặt lịch phát hành'}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="gap-2">
                      <Button
                        variant={row.cadence === 'weekly' ? 'default' : 'outline'}
                        size="sm"
                        disabled={isSaving}
                        onClick={() => handleSetSchedule(row.seriesid, 'weekly')}
                      >
                        {isSaving && <Loader2 className="size-4 animate-spin" />}
                        Theo tuần
                      </Button>
                      <Button
                        variant={row.cadence === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        disabled={isSaving}
                        onClick={() => handleSetSchedule(row.seriesid, 'monthly')}
                      >
                        {isSaving && <Loader2 className="size-4 animate-spin" />}
                        Theo tháng
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })
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
          <p className="mt-1 text-xs">
            <code className="rounded bg-muted px-1">Draft → EditorReview → EBReview → Publishing</code>
          </p>
        </div>
        <Separator />
        <div>
          <p className="font-medium text-foreground">Phát hành định kỳ</p>
          <p>Studio → Ready → {LABEL_EDITOR_BOARD} duyệt → Published</p>
          <p className="mt-1 text-xs">Tantou theo dõi tiến độ, không duyệt chapter.</p>
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