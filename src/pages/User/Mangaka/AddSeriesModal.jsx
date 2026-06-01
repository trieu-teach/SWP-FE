import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { LABEL_EDITOR_BOARD, PATH_EDITOR_BOARD } from '@/constants/roleTerminology.js'
import {
  SERIES_CONTENT_RATINGS,
  SERIES_DEMOGRAPHICS,
  SERIES_FORMATS,
  SERIES_GENRES,
  SERIES_LANGUAGES,
  SERIES_PALETTE,
  SERIES_PUBLICATION_STATUSES,
  SERIES_PUBLISH_TYPES,
  createEmptySeriesForm,
  seriesToForm,
  validateSeriesForm,
} from '@/utils/seriesModel.js'

export default function AddSeriesModal({
  open,
  onClose,
  onSubmit,
  mode = 'create',
  initialSeries = null,
  authorName = '',
  existingTitles = [],
}) {
  const isEdit = mode === 'edit' && initialSeries

  const [form, setForm] = useState(() => createEmptySeriesForm(authorName))
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isEdit) setForm(seriesToForm(initialSeries))
    else setForm(createEmptySeriesForm(authorName))
    setTouched(false)
  }, [open, isEdit, initialSeries?.id, authorName])

  const titlesForValidation = useMemo(() => {
    if (!isEdit) return existingTitles
    const self = String(initialSeries.title ?? '').toLowerCase()
    return existingTitles.filter(t => String(t).toLowerCase() !== self)
  }, [existingTitles, isEdit, initialSeries?.title])

  const validation = useMemo(
    () => validateSeriesForm(form, titlesForValidation),
    [form, titlesForValidation],
  )

  function patch(updates) { setForm(prev => ({ ...prev, ...updates })) }

  function toggleGenre(genre) {
    setForm(prev => {
      const has = prev.genres.includes(genre)
      const genres = has
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre].slice(0, 5)
      return { ...prev, genres }
    })
  }

  function handleClose() {
    setForm(isEdit ? seriesToForm(initialSeries) : createEmptySeriesForm(authorName))
    setTouched(false)
    onClose()
  }

  function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!validation.ok) return
    onSubmit(form, { mode: isEdit ? 'edit' : 'create', seriesId: initialSeries?.id })
    if (!isEdit) setForm(createEmptySeriesForm(authorName))
    setTouched(false)
  }

  const err = (key) => (touched ? validation.errors[key] : null)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="relative shrink-0 space-y-1.5 border-b bg-gradient-to-br from-rose-50 via-background to-background px-6 py-5 dark:from-rose-500/10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-rose-500 text-white">{isEdit ? '✎' : '+'}</span>
            {isEdit ? 'Chỉnh sửa hồ sơ' : 'Tạo mới'}
          </div>
          <DialogTitle className="text-xl">{isEdit ? `Series · ${initialSeries?.title || ''}` : 'Đăng ký series mới'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Bổ sung hoặc sửa thông tin còn thiếu — tóm tắt, thể loại, phân loại…'
              : 'Khai báo hồ sơ một lần — các bên khác chỉ xem tóm tắt.'}
          </DialogDescription>
          {isEdit && !initialSeries.metadataComplete ? (
            <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5">
              <AlertCircle className="size-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Hồ sơ chưa đầy đủ — nên điền tóm tắt và thể loại.
              </AlertDescription>
            </Alert>
          ) : null}
        </DialogHeader>

        <form id="series-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            <div className="space-y-7">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="size-6 justify-center p-0 text-xs">1</Badge>
                  <h3 className="font-semibold">Thông tin truyện</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="series-title">
                    Tên hiển thị <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="series-title"
                    value={form.title}
                    onChange={e => patch({ title: e.target.value })}
                    placeholder="Ví dụ: Huyền Long Ký"
                    maxLength={120}
                    autoFocus
                    aria-invalid={!!err('title')}
                  />
                  {err('title') ? <p className="text-xs text-destructive">{err('title')}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="series-alt">Tên khác / Romaji</Label>
                    <Input
                      id="series-alt"
                      value={form.altTitle}
                      onChange={e => patch({ altTitle: e.target.value })}
                      placeholder="Tùy chọn"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="series-tags">Tag</Label>
                    <Input
                      id="series-tags"
                      value={form.tags}
                      onChange={e => patch({ tags: e.target.value })}
                      placeholder="school-life, magic"
                      maxLength={120}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="series-synopsis">
                    Tóm tắt / giới thiệu <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="series-synopsis"
                    value={form.synopsis}
                    onChange={e => patch({ synopsis: e.target.value })}
                    placeholder="Cốt truyện, bối cảnh, nhân vật chính..."
                    rows={4}
                    maxLength={2000}
                    aria-invalid={!!err('synopsis')}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{form.synopsis.length}/2000 · tối thiểu 30 ký tự</span>
                    {err('synopsis') ? <span className="text-destructive">{err('synopsis')}</span> : null}
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="size-6 justify-center p-0 text-xs">2</Badge>
                  <h3 className="font-semibold">Phân loại</h3>
                </div>

                <div className="space-y-2">
                  <Label>Thể loại <span className="text-xs text-muted-foreground">(tối đa 5)</span></Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SERIES_GENRES.map(g => {
                      const active = form.genres.includes(g)
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenre(g)}
                          aria-pressed={active}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background hover:border-primary/50 hover:bg-muted',
                          )}
                        >
                          {active ? <Check className="size-3" /> : null}
                          {g}
                        </button>
                      )
                    })}
                  </div>
                  {err('genres') ? <p className="text-xs text-destructive">{err('genres')}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Độc giả mục tiêu</Label>
                    <Select value={form.demographic} onValueChange={v => patch({ demographic: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERIES_DEMOGRAPHICS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Định dạng</Label>
                    <Select value={form.format} onValueChange={v => patch({ format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERIES_FORMATS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ngôn ngữ gốc</Label>
                    <Select value={form.language} onValueChange={v => patch({ language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERIES_LANGUAGES.map(l => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phân loại nội dung</Label>
                    <Select value={form.contentRating} onValueChange={v => patch({ contentRating: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERIES_CONTENT_RATINGS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="size-6 justify-center p-0 text-xs">3</Badge>
                  <h3 className="font-semibold">Phát hành & luồng duyệt</h3>
                </div>

                <div className="space-y-2">
                  <Label>Trạng thái phát hành</Label>
                  <Select value={form.publicationStatus} onValueChange={v => patch({ publicationStatus: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERIES_PUBLICATION_STATUSES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Loại phát hành</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SERIES_PUBLISH_TYPES.map(pt => {
                      const active = form.publishType === pt.value
                      return (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => patch({ publishType: pt.value })}
                          aria-pressed={active}
                          className={cn(
                            'flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-colors',
                            active
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50',
                          )}
                        >
                          <span className="text-sm font-medium">{pt.label}</span>
                          <span className="text-xs text-muted-foreground">{pt.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {form.publishType === 'debut' ? (
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                      {LABEL_EDITOR_BOARD} duyệt trên{' '}
                      <Link to={PATH_EDITOR_BOARD} className="font-medium text-primary hover:underline">
                        trang {LABEL_EDITOR_BOARD}
                      </Link>
                      {' '}— Mangaka không tự chấp nhận.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="size-6 justify-center p-0 text-xs">4</Badge>
                  <h3 className="font-semibold">Màu bìa (draft)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SERIES_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => patch({ color: c })}
                      aria-pressed={form.color === c}
                      aria-label={`Màu ${c}`}
                      className={cn(
                        'size-9 rounded-lg ring-offset-background transition-transform hover:scale-110',
                        form.color === c && 'ring-2 ring-primary ring-offset-2',
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-card/95 px-6 py-3 backdrop-blur sm:gap-3">
            {touched && !validation.ok ? (
              <p className="mr-auto self-center text-xs text-destructive sm:order-first">
                Vui lòng kiểm tra các trường còn thiếu
              </p>
            ) : null}
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="submit" form="series-form" className="min-w-[140px]">
              {isEdit ? 'Lưu thay đổi' : 'Tạo series draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
