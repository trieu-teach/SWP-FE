import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, BookOpen, CheckCircle2, Clock,
  Eye, FileEdit, Search, TriangleAlert, X,
} from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { WorkspaceHero } from '@/components/layout/WorkspaceHero.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getSession, logout } from '@/lib/auth.js'
import { LABEL_TANTOU_EDITOR } from '@/constants/roleTerminology.js'
import { NAV_LINKS } from '@/constants/tantou.js'
import { useTantouWorkspace } from '@/hooks/useTantouWorkspace.js'
import {
  normalizeStatus, statusVariant, statusLabel, isDelayedDeadline,
} from './TantouEditor.helpers.js'
import { CoverThumb } from '@/components/User/Tantou/CoverThumb.jsx'
import './TantouEditor.css'

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-sky-600 bg-sky-500/10',
    warn: 'text-amber-600 bg-amber-500/10',
    danger: 'text-rose-600 bg-rose-500/10',
    success: 'text-emerald-600 bg-emerald-500/10',
  }[tone]

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Backend trả field theo camelCase khi serialize JSON (MangakaName → mangakaName),
// nhưng project có tiền lệ đôi lúc trả lowercase liền (xem axiosClient.js normalizeKeys
// không đồng nhất giữa endpoint) — nên đọc cả 2 khả năng cho chắc.
function resolveMangakaName(mangakaid, ...candidates) {
  const found = candidates.find(v => v != null && v !== '')
  return found ?? `Mangaka #${mangakaid}`
}

const STATUS_FILTERS = ['all', 'pending', 'inproduction', 'delayed', 'ready']

export default function TantouDashboard() {
  const navigate = useNavigate()
  const user = getSession()

  const {
    loading,
    debutQueue,
    ebQueue,
    studioQueue,
    delayedCount,
  } = useTantouWorkspace()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // ── Gộp debut queue + studio chapters thành 1 danh sách dòng cho bảng ──────
  const allRows = useMemo(() => {
    const debutRows = debutQueue.map(s => ({
      kind: 'debut',
      seriesid: s.seriesid,
      chapterid: null,
      seriesTitle: s.title,
      cover: s.coverimageurl,
      mangaka: resolveMangakaName(s.mangakaid, s.mangakaname, s.mangakaName, s.MangakaName),
      chapterLabel: 'Lần đầu',
      submittedAt: s.createdat ?? null,
      deadline: null,
      status: s.status,
      raw: s,
    }))

    const studioRows = studioQueue.map(ch => {
      const si = ch.seriesInfo
      return {
        kind: 'studio',
        seriesid: ch.seriesid,
        chapterid: ch.chapterid ?? ch.Chapterid ?? ch.id,
        seriesTitle: si?.title ?? `Series #${ch.seriesid}`,
        cover: si?.coverimageurl,
        mangaka: si
          ? resolveMangakaName(si.mangakaid, si.mangakaname, si.mangakaName, si.MangakaName)
          : '—',
        chapterLabel: `Ch. ${ch.chapternumber ?? '—'}`,
        submittedAt: ch.createdat ?? ch.submittedat ?? null,
        deadline: ch.deadline ?? null,
        status: ch.status,
        raw: ch,
      }
    })

    return [...debutRows, ...studioRows]
  }, [debutQueue, studioQueue])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter(r => {
      const matchStatus = statusFilter === 'all' || normalizeStatus(r.status) === statusFilter
      const matchSearch = !q
        || r.seriesTitle.toLowerCase().includes(q)
        || r.mangaka.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [allRows, search, statusFilter])

  // ── Gộp nhóm theo seriesid — giữ nguyên thứ tự xuất hiện lần đầu ───────────
  const groupedRows = useMemo(() => {
    const groups = new Map()
    filteredRows.forEach(r => {
      if (!groups.has(r.seriesid)) groups.set(r.seriesid, [])
      groups.get(r.seriesid).push(r)
    })
    return Array.from(groups.values())
  }, [filteredRows])

  const reviewingCount = debutQueue.length + ebQueue.length
  const completedCount = useMemo(
    () => studioQueue.filter(ch => normalizeStatus(ch.status) === 'published').length,
    [studioQueue],
  )

  return (
    <div className="ws-page--tantou flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />

      <WorkspaceHero
        className="from-sky-950 to-zinc-950"
        label={LABEL_TANTOU_EDITOR}
        title={`Xin chào${user?.name ? `, ${user.name}` : ''}`}
        description="Tổng quan các series được phân công, deadline và tiến độ studio."
      />

      <main className="page-container flex-1 space-y-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={FileEdit} label="Đang review" value={reviewingCount} tone="default" />
          <StatCard icon={AlertTriangle} label="Sắp/trễ deadline" value={delayedCount} tone="danger" />
          <StatCard icon={Clock} label="Đang sản xuất" value={studioQueue.length} tone="warn" />
          <StatCard icon={CheckCircle2} label="Đã hoàn thành" value={completedCount} tone="success" />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4" />
              Danh sách Submission
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm series, mangaka..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 w-48 pl-8 pr-7 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              {STATUS_FILTERS.map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'Tất cả' : statusLabel(s)}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Đang tải...</div>
            ) : groupedRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Không có submission nào khớp.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14"></TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Mangaka</TableHead>
                    <TableHead>Ngày gửi</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.map((group, gi) => {
                    const labelCounts = {}
                    group.forEach(r => {
                      labelCounts[r.chapterLabel] = (labelCounts[r.chapterLabel] ?? 0) + 1
                    })

                    return group.map((r, idx) => {
                      const isFirst = idx === 0
                      const delayed = isDelayedDeadline(r.deadline, r.status)
                      const isDupLabel = r.kind === 'studio' && labelCounts[r.chapterLabel] > 1
                      const rowKey = r.kind === 'studio'
                        ? `studio-chapter-${r.chapterid}`
                        : `debut-series-${r.seriesid}`

                      return (
                        <TableRow
                          key={rowKey}
                          className={[
                            gi % 2 === 1 ? 'bg-muted/20' : undefined,
                            !isFirst ? 'border-t-0' : undefined,
                          ].filter(Boolean).join(' ')}
                        >
                          {isFirst && (
                            <TableCell rowSpan={group.length} className="align-top border-r">
                              <CoverThumb url={r.cover} sizeClass="size-10" />
                            </TableCell>
                          )}
                          {isFirst && (
                            <TableCell rowSpan={group.length} className="align-top border-r font-medium">
                              {r.seriesTitle}
                              {group.length > 1 && (
                                <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                                  {group.length} mục
                                </p>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              {!isFirst && <span className="text-muted-foreground/40">└</span>}
                              {r.chapterLabel}
                              {isDupLabel && (
                                <TriangleAlert
                                  className="size-3.5 text-amber-500"
                                  aria-label="Trùng số chương trong cùng series"
                                />
                              )}
                            </span>
                          </TableCell>
                          {isFirst && (
                            <TableCell rowSpan={group.length} className="align-top text-sm text-muted-foreground">
                              {r.mangaka}
                            </TableCell>
                          )}
                          <TableCell className="text-sm text-muted-foreground">
                            {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('vi-VN') : '—'}
                          </TableCell>
                          <TableCell className={`text-sm ${delayed ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                            {r.deadline ? new Date(r.deadline).toLocaleDateString('vi-VN') : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {isFirst && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => navigate(`/tantou/series/${r.seriesid}`)}
                                >
                                  <Eye className="size-3.5" /> View
                                </Button>
                              )}
                              {r.kind === 'debut' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => navigate('/tantou/editor', { state: { reviewSub: r.raw } })}
                                >
                                  <FileEdit className="size-3.5" /> Review
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}