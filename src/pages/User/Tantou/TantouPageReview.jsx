import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { noteTaskLabel } from '@/constants/workspaceTasks.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import '@/styles/mangaPage.css'

export default function TantouPageReview({
  submission,
  editorialComment,
  onEditorialCommentChange,
  onBack,
}) {
  const [selectedMangakaId, setSelectedMangakaId] = useState(null)
  const mangakaNotes = submission?.mangakaNotes ?? []

  const selectedMangaka = useMemo(() => {
    if (!selectedMangakaId) return null
    return mangakaNotes.find((n, i) => (n.id || `m-${i}`) === selectedMangakaId) ?? null
  }, [mangakaNotes, selectedMangakaId])

  if (!submission) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Danh sách
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{submission.seriesTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Ch. {submission.chapterNum} · {submission.pageLabel}
          </p>
        </div>
        <Badge variant={submission.pipeline === 'debut' ? 'destructive' : 'secondary'}>
          {submission.pipeline === 'debut' ? 'Lần đầu · có EB' : 'Đã qua EB'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base">Trang truyện</CardTitle>
            <CardDescription>Ô đỏ = ghi chú Mangaka (chỉ xem)</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center bg-zinc-950 p-4 md:p-6">
            <div className="relative w-full max-w-[728px]">
              <div className="mk-board manga-page manga-page--canvas relative mx-auto aspect-[728/1030] bg-zinc-900">
                {submission.mangakaImageUrl ? (
                  <img
                    src={submission.mangakaImageUrl}
                    alt=""
                    className="mk-board__img manga-page__media absolute inset-0 size-full object-contain"
                    draggable={false}
                    width={728}
                    height={1030}
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
          ) : null}

          <Card className="flex-1 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Nhận xét</CardTitle>
              <CardDescription>
                Viết nhận xét gửi Mangaka khi chưa đạt. Bắt buộc có nội dung trước khi gửi chỉnh.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={12}
                placeholder="Nhận xét biên tập cho Mangaka..."
                value={editorialComment}
                onChange={e => onEditorialCommentChange(e.target.value)}
                className="min-h-[220px] resize-y"
              />
              {editorialComment.trim() ? (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onEditorialCommentChange('')}>
                  Xóa nhận xét
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
