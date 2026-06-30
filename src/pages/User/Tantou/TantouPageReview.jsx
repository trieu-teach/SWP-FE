import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, MessageSquarePlus, Send, Trash2, XCircle } from 'lucide-react'
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
// issueType riêng cho nhận xét chung của Tantou (không gắn vị trí, box = 0).
const TANTOU_COMMENT_TYPE = 'TantouComment'
// issueType cho ghi chú gốc của Mangaka (tạo trong ChapterAnnotator)
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
 * Panel nhận xét riêng của Tantou — không sửa/đè ghi chú gốc (Mangaka/Assistant),
 * chỉ thêm record mới qua PageIssues với issueType = 'TantouComment'.
 * Schema thật chỉ filter theo pageid (không có chapterId) → cần pageId cụ thể của trang đang xem.
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
      .filter(i => issueType(i) === TANTOU_COMMENT_TYPE)
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

  // pageId thật của trang đang xem — lấy từ pages[pageIndex] do TantouEditor truyền xuống
  // (mảng reviewPages, mỗi item có serverPageId)
  const currentPage = pages[pageIndex] ?? null
  const currentPageId = currentPage?.serverPageId ?? null

  // Ghi chú Mangaka thật từ PageIssues (issueType = 'MangakaNote'), lọc theo trang đang xem
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

  // Lần đầu (pipeline === 'debut') → cần chuyển EB.
  // Đã qua EB (recurring / EB-approved) → chỉ cần Tantou duyệt nhanh.
  const isDebut = submission.pipeline === 'debut'
  const hasComment = editorialComment.trim().length > 0
  const pageImageUrl = currentPage?.url ?? submission.mangakaImageUrl ?? null

  return (
    // pb-24 chừa chỗ cho thanh nút sticky ở cuối trang, tránh che nội dung
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
                <CardDescription>Ô đỏ = ghi chú Mangaka (chỉ xem)</CardDescription>
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
                    // Ảnh lỗi (domain CDN chưa resolve được / 404...) → ẩn ảnh,
                    // giữ nguyên khung zinc-900 + các ô ghi chú đỏ định vị theo %
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
                {selectedMangaka ? (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="mb-1 font-medium text-rose-700">{noteTaskLabel(selectedMangaka.taskType)}</p>
                    <p>{selectedMangaka.text || 'Không có mô tả'}</p>
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

          {/* Giai đoạn 1: nhận xét lại của Tantou trên trang truyện gốc — gắn theo trang
              đang xem, không sửa note Mangaka, chỉ thêm panel riêng (PageIssues) */}
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

          {/* Giai đoạn 2: nhận xét lại của Tantou cho phần "Ghi chú cho Mangaka" —
              cùng trang nhưng panel riêng để phân biệt rõ 2 giai đoạn trong luồng */}
          <TantouCommentPanel
            pageId={currentPageId}
            title="Nhận xét của Tantou — Ghi chú cho Mangaka"
          />
        </div>
      </div>

      {/* Thanh hành động sticky — "Yêu cầu chỉnh sửa" chỉ gửi notification, KHÔNG đổi status
          (xem handleRequestRevision trong TantouEditor.jsx). Tantou không có quyền reject/lùi
          status về Draft — quyết định duyệt/từ chối series thuộc về Editorial Board. */}
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