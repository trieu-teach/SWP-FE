import { useMemo, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, Loader2, MessageSquarePlus,
  Send, Send as SendIcon, Trash2, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { noteTaskLabel } from '@/constants/workspaceTasks.js'
import { LABEL_EDITOR_BOARD } from '@/constants/roleTerminology.js'
import { getSession } from '@/lib/auth.js'
import {
  usePageIssues,
  useCreatePageIssue,
  useDeletePageIssue,
} from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import '@/styles/mangaPage.css'

// Schema thật của PageIssue (Swagger POST /api/PageIssues):
//   pageid, createdById, assignedToId, issueType, workCategory,
//   boxX, boxY, boxWidth, boxHeight, description, deadline
// Không có chapterId — mọi issue gắn theo 1 pageid cụ thể.
// Không có cột parent/reply → dùng prefix [ref:id] trong description để
// gắn comment Tantou vào đúng annotation Mangaka (xem AnnotationThread).
const TANTOU_COMMENT_TYPE = 'TantouComment'
const MANGAKA_NOTE_TYPE = 'MangakaNote'

function issueField(issue, camelKey, lowerKey) {
  return issue?.[camelKey] ?? issue?.[lowerKey] ?? issue?.[camelKey?.toLowerCase()] ?? null
}

function tantouCommentAuthor(issue) {
  return issueField(issue, 'createdByName', 'created_by_name') ?? 'Tantou Editor'
}

function tantouCommentText(issue) {
  return issueField(issue, 'description', 'description') ?? ''
}

function tantouCommentDate(issue) {
  const raw = issueField(issue, 'createdat', 'createdAt')
  if (!raw) return ''
  try {
    return new Date(raw).toLocaleString('vi-VN')
  } catch {
    return ''
  }
}

function issueId(issue) {
  return issueField(issue, 'issueid', 'issueId')
}

function issueType(issue) {
  return issueField(issue, 'issueType', 'issue_type')
}

/**
 * Thread nhận xét Tantou gắn theo 1 annotation Mangaka cụ thể.
 * Workaround vì PageIssue không có cột parent: dùng prefix `[ref:<mangakaNoteId>]`
 * trong description để lọc lại đúng thread khi hiển thị.
 * Nếu BE sau này thêm cột parentIssueId, nên migrate sang filter theo cột đó.
 */
function AnnotationThread({ pageId, mangakaNoteId }) {
  const [draft, setDraft] = useState('')
  const session = getSession()
  const { data: issuesRaw = [] } = usePageIssues({ pageId })
  const createIssue = useCreatePageIssue()

  const REF_PREFIX = `[ref:${mangakaNoteId}]`

  const threadComments = useMemo(() => {
    if (!Array.isArray(issuesRaw)) return []
    return issuesRaw
      .filter(i => issueType(i) === TANTOU_COMMENT_TYPE && tantouCommentText(i).startsWith(REF_PREFIX))
      .sort((a, b) => {
        const ad = new Date(issueField(a, 'createdat', 'createdAt') ?? 0).getTime()
        const bd = new Date(issueField(b, 'createdat', 'createdAt') ?? 0).getTime()
        return ad - bd
      })
  }, [issuesRaw, REF_PREFIX])

  async function handleSend() {
    const text = draft.trim()
    if (!text || !pageId) return
    try {
      await createIssue.mutateAsync({
        pageid: pageId,
        createdById: session?.id ?? session?.userid ?? null,
        assignedToId: null,
        issueType: TANTOU_COMMENT_TYPE,
        workCategory: 'review',
        boxX: 0,
        boxY: 0,
        boxWidth: 0,
        boxHeight: 0,
        description: `${REF_PREFIX} ${text}`,
        deadline: null,
      })
      setDraft('')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Không gửi được nhận xét.')
    }
  }

  return (
    <div className="space-y-2">
      {threadComments.length === 0 ? (
        <p className="rounded-md bg-white/70 p-2 text-xs text-muted-foreground dark:bg-black/20">
          Chưa có nhận xét.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {threadComments.map((c, i) => (
            <li key={issueId(c) ?? i} className="rounded-md bg-sky-50 p-2 text-sm dark:bg-sky-500/10">
              {tantouCommentText(c).replace(REF_PREFIX, '').trim()}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Nhận xét cho annotation này..."
          className="flex-1 rounded-md border px-2 py-1.5 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <Button size="icon-sm" onClick={handleSend} disabled={createIssue.isPending || !draft.trim()}>
          {createIssue.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}

/**
 * Panel nhận xét chung của Tantou (không gắn annotation cụ thể) — dùng cho
 * 2 khu vực: trang truyện gốc và phần "Ghi chú cho Mangaka".
 */
function TantouCommentPanel({ pageId, title = 'Nhận xét của Tantou' }) {
  const [draft, setDraft] = useState('')
  const session = getSession()

  const { data: issuesRaw = [], isLoading } = usePageIssues({ pageId })
  const createIssue = useCreatePageIssue()
  const deleteIssue = useDeletePageIssue()

  const tantouComments = useMemo(() => {
    if (!Array.isArray(issuesRaw)) return []
    return issuesRaw
      .filter(i => issueType(i) === TANTOU_COMMENT_TYPE && !tantouCommentText(i).startsWith('[ref:'))
      .sort((a, b) => {
        const ad = new Date(issueField(a, 'createdat', 'createdAt') ?? 0).getTime()
        const bd = new Date(issueField(b, 'createdat', 'createdAt') ?? 0).getTime()
        return bd - ad
      })
  }, [issuesRaw])

  async function handleAdd() {
    const text = draft.trim()
    if (!text) {
      toast.error('Nhập nội dung nhận xét trước khi gửi.')
      return
    }
    if (!pageId) {
      toast.error('Chưa xác định được trang để gắn nhận xét.')
      return
    }
    try {
      await createIssue.mutateAsync({
        pageid: pageId,
        createdById: session?.id ?? session?.userid ?? null,
        assignedToId: null,
        issueType: TANTOU_COMMENT_TYPE,
        workCategory: 'review',
        boxX: 0,
        boxY: 0,
        boxWidth: 0,
        boxHeight: 0,
        description: text,
        deadline: null,
      })
      setDraft('')
      toast.success('Đã thêm nhận xét.')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Không gửi được nhận xét — thử lại.')
    }
  }

  async function handleDelete(id) {
    if (typeof window !== 'undefined' && !window.confirm('Xóa nhận xét này?')) return
    try {
      await deleteIssue.mutateAsync(id)
      toast.success('Đã xóa nhận xét.')
    } catch {
      toast.error('Không xóa được nhận xét.')
    }
  }

  return (
    <Card className="border-sky-200 dark:border-sky-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="size-4 text-sky-600" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>
          Ghi chú riêng của bạn — không thay đổi nội dung của Mangaka/Assistant, chỉ lưu thêm bên cạnh.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!pageId ? (
          <p className="text-xs text-muted-foreground">Chưa có trang nào để nhận xét.</p>
        ) : (
          <>
            <Textarea
              rows={2}
              placeholder="Viết nhận xét, đánh giá lại..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="resize-y"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={createIssue.isPending || !draft.trim()}>
                <Send className="size-3.5" />
                {createIssue.isPending ? 'Đang gửi...' : 'Gửi nhận xét'}
              </Button>
            </div>

            <Separator />

            {isLoading ? (
              <p className="text-xs text-muted-foreground">Đang tải nhận xét...</p>
            ) : tantouComments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có nhận xét nào.</p>
            ) : (
              <ScrollArea className="max-h-56">
                <ul className="space-y-2 pr-3">
                  {tantouComments.map((c, idx) => {
                    const cid = issueId(c) ?? `tc-${idx}`
                    return (
                      <li key={cid} className="rounded-lg border bg-sky-50/50 p-3 text-sm dark:bg-sky-500/5">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-sky-700 dark:text-sky-400">
                            {tantouCommentAuthor(c)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{tantouCommentDate(c)}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(cid)}
                              title="Xóa nhận xét"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{tantouCommentText(c)}</p>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function TantouPageReview({
  submission,
  editorialComment,
  onEditorialCommentChange,
  onBack,
  onForwardEb,
  onRequestRevision,
  onApproveRecurring,
  pages = [],
  pageIndex = 0,
  onPageIndexChange,
}) {
  const [selectedMangakaId, setSelectedMangakaId] = useState(null)

  const currentPage = pages[pageIndex] ?? null
  const currentPageId = currentPage?.serverPageId ?? null

  const { data: pageIssuesRaw = [] } = usePageIssues({ pageId: currentPageId })

  const mangakaNotes = useMemo(() => {
    if (!Array.isArray(pageIssuesRaw)) return []
    return pageIssuesRaw
      .filter(i => issueType(i) === MANGAKA_NOTE_TYPE)
      .map(i => ({
        id: String(issueId(i)),
        x: issueField(i, 'boxX', 'box_x') ?? 0,
        y: issueField(i, 'boxY', 'box_y') ?? 0,
        w: issueField(i, 'boxWidth', 'box_width') ?? 0,
        h: issueField(i, 'boxHeight', 'box_height') ?? 0,
        text: issueField(i, 'description', 'description') ?? '',
        taskType: issueField(i, 'workCategory', 'work_category') ?? 'background',
      }))
  }, [pageIssuesRaw])

  const selectedMangaka = useMemo(() => {
    if (!selectedMangakaId) return null
    return mangakaNotes.find((n, i) => (n.id || `m-${i}`) === selectedMangakaId) ?? null
  }, [mangakaNotes, selectedMangakaId])

  if (!submission) return null

  const isDebut = submission.pipeline === 'debut'
  const hasComment = editorialComment.trim().length > 0
  const pageImageUrl = currentPage?.url ?? submission.mangakaImageUrl ?? null

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Danh sách
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{submission.seriesTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Ch. {submission.chapterNum} · {submission.pageLabel}
            {pages.length > 0 ? ` · Trang ${pageIndex + 1}/${pages.length}` : null}
          </p>
        </div>
        <Badge variant={submission.pipeline === 'debut' ? 'destructive' : 'secondary'}>
          {submission.pipeline === 'debut' ? 'Lần đầu · có EB' : 'Đã qua EB'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b bg-muted/30 py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Trang truyện</CardTitle>
                <CardDescription>Ô đỏ = ghi chú Mangaka (bấm để xem & trả lời)</CardDescription>
              </div>
              {pages.length > 1 && onPageIndexChange ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={pageIndex === 0}
                    onClick={() => onPageIndexChange(pageIndex - 1)}
                  >
                    ‹
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pageIndex + 1}/{pages.length}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={pageIndex >= pages.length - 1}
                    onClick={() => onPageIndexChange(pageIndex + 1)}
                  >
                    ›
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex justify-center bg-zinc-950 p-4 md:p-6">
            <div className="relative w-full max-w-[728px]">
              <div className="mk-board manga-page manga-page--canvas relative mx-auto aspect-[728/1030] bg-zinc-900">
                {pageImageUrl ? (
                  <img
                    src={pageImageUrl}
                    alt=""
                    className="mk-board__img manga-page__media absolute inset-0 size-full object-contain"
                    draggable={false}
                    width={728}
                    height={1030}
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  />
                ) : null}
                {mangakaNotes.map((n, idx) => {
                  const mid = n.id || `m-${idx}`
                  return (
                    <button
                      key={mid}
                      type="button"
                      className={`absolute box-border cursor-pointer rounded border-2 border-dashed border-rose-500 bg-rose-500/15 transition-shadow ${
                        selectedMangakaId === mid ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
                      }`}
                      style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${n.w}%`, height: `${n.h}%` }}
                      onClick={() => setSelectedMangakaId(mid)}
                      title={n.text || 'Ghi chú Mangaka'}
                    >
                      <span className="absolute left-1 top-0.5 rounded bg-rose-600 px-1 text-[10px] font-bold text-white">
                        M{idx + 1}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {mangakaNotes.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ghi chú Mangaka</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ScrollArea className="max-h-40">
                  <div className="space-y-2 pr-3">
                    {mangakaNotes.map((n, i) => {
                      const mid = n.id || `m-${i}`
                      return (
                        <button
                          key={mid}
                          type="button"
                          onClick={() => setSelectedMangakaId(mid)}
                          className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                            selectedMangakaId === mid ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                        >
                          <Badge variant="outline" className="mb-1 border-rose-200 text-rose-700">
                            M{i + 1}
                          </Badge>
                          <p className="line-clamp-2 text-muted-foreground">{n.text || '—'}</p>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* ── Annotation card: 📍 Mangaka note + thread Tantou ── */}
                {selectedMangaka ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 text-sm dark:bg-rose-500/5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                      📍 Annotation
                    </p>

                    <div className="mb-1">
                      <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                        {noteTaskLabel(selectedMangaka.taskType)} · Mangaka:
                      </p>
                      <p className="rounded-md bg-white/70 p-2 text-sm dark:bg-black/20">
                        {selectedMangaka.text || 'Không có mô tả'}
                      </p>
                    </div>

                    <div className="my-2 border-t border-dashed" />

                    <div>
                      <p className="mb-1 text-[11px] font-medium text-sky-700">Tantou:</p>
                      <AnnotationThread pageId={currentPageId} mangakaNoteId={selectedMangaka.id} />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-xs text-muted-foreground">
                Trang này chưa có ghi chú nào từ Mangaka.
              </CardContent>
            </Card>
          )}

          {/* Nhận xét chung của Tantou trên trang truyện gốc — không gắn annotation cụ thể */}
          <TantouCommentPanel
            pageId={currentPageId}
            title="Nhận xét của Tantou — Trang truyện"
          />

          <Card className="flex-1 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Ghi chú cho Mangaka</CardTitle>
              <CardDescription>
                Đánh dấu chỗ cần chỉnh nội dung, thoại, kịch bản. Bắt buộc nhập nếu chọn "Yêu cầu chỉnh sửa";
                không bắt buộc nếu chuyển thẳng sang {LABEL_EDITOR_BOARD}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={12}
                placeholder="Ghi chú cho Mangaka (không bắt buộc)..."
                value={editorialComment}
                onChange={e => onEditorialCommentChange(e.target.value)}
                className="min-h-[220px] resize-y"
              />
              {editorialComment.trim() ? (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onEditorialCommentChange('')}>
                  Xóa ghi chú
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <TantouCommentPanel
            pageId={currentPageId}
            title="Nhận xét của Tantou — Ghi chú cho Mangaka"
          />
        </div>
      </div>

      {/* Thanh hành động sticky — "Yêu cầu chỉnh sửa" chỉ gửi notification, KHÔNG đổi status.
          Tantou không có quyền reject/lùi status về Draft — quyết định duyệt/từ chối thuộc EB. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="page-container flex flex-wrap items-center justify-end gap-2 py-3">
          {isDebut && (
            <Button
              variant="outline"
              onClick={onRequestRevision}
              disabled={!hasComment}
              title={!hasComment ? 'Nhập ghi chú trước khi yêu cầu Mangaka chỉnh sửa' : undefined}
              className="gap-2"
            >
              <XCircle className="size-4" />
              Yêu cầu chỉnh sửa
            </Button>
          )}

          {isDebut ? (
            <Button onClick={onForwardEb} className="gap-2">
              <Send className="size-4" />
              Chuyển sang {LABEL_EDITOR_BOARD}
            </Button>
          ) : (
            <Button onClick={onApproveRecurring} className="gap-2">
              <CheckCircle2 className="size-4" />
              Duyệt nhanh
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}