import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  SERIES_CONTENT_RATINGS,
  createEmptySeriesForm,
  seriesToForm,
  validateSeriesForm,
} from '@/utils/seriesModel.js'
import { useGenres, useTags } from '@/api/hooks'

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

  const { data: apiGenres = [], isLoading: genresLoading } = useGenres()
  const { data: apiTags = [], isLoading: tagsLoading } = useTags()

  const [form, setForm] = useState(() => createEmptySeriesForm(authorName))
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isEdit) setForm(seriesToForm(initialSeries))
    else setForm(createEmptySeriesForm(authorName))
    setTouched(false)
  }, [open, isEdit, initialSeries, authorName])

  const titlesForValidation = useMemo(() => {
    if (!isEdit) return existingTitles
    const self = String(initialSeries?.title ?? '').toLowerCase()
    return existingTitles.filter(t => String(t).toLowerCase() !== self)
  }, [existingTitles, isEdit, initialSeries])

  const validation = useMemo(
    () => validateSeriesForm(form, titlesForValidation),
    [form, titlesForValidation],
  )

  function patch(updates) {
    setForm(prev => ({ ...prev, ...updates }))
  }

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
      <DialogContent className="asm-dialog">
        <DialogHeader className="sr-only">
          <DialogTitle>{isEdit ? 'Chỉnh sửa series' : 'Tạo series mới'}</DialogTitle>
          <DialogDescription>Điền thông tin để tạo hoặc cập nhật series truyện.</DialogDescription>
        </DialogHeader>
        {/* Header — gradient hero */}
        <div className="asm-hero">
          <div className="asm-hero__glow asm-hero__glow--1" />
          <div className="asm-hero__glow asm-hero__glow--2" />
          <div className="asm-hero__inner">
            <div className="asm-hero__pill">
              <span className="asm-hero__pill-dot" />
              {isEdit ? 'Chinh sua series' : 'Series moi'}
            </div>
            <h2 className="asm-hero__title">
              {isEdit ? `✦ ${initialSeries?.title || ''}` : 'Dang ky series moi'}
            </h2>
            <p className="asm-hero__sub">
              {isEdit
                ? 'Cap nhat thong tin de hoan thien ho so truyen.'
                : 'Khai bao ho so de cac ben phoi hop tren cung mot nguon chuan.'}
            </p>
            {isEdit && !initialSeries?.metadataComplete ? (
              <Alert className="asm-warn">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  Ho so chua day du — nen dien tom tat va the loai.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>

        <form id="series-form" onSubmit={handleSubmit} className="asm-body">
          {/* ===== SECTION 1: Thong tin truyen ===== */}
          <section className="asm-section">
            <div className="asm-section__head">
              <span className="asm-section__num">1</span>
              <h3 className="asm-section__title">Thong tin truyen</h3>
            </div>

            <div className="asm-field">
              <Label className="asm-label" htmlFor="series-title">
                Ten hien thi <span className="asm-req">*</span>
              </Label>
              <Input
                id="series-title"
                className="asm-input"
                value={form.title}
                onChange={e => patch({ title: e.target.value })}
                placeholder="Vi du: Huyen Long Ky"
                maxLength={120}
                autoFocus
                aria-invalid={!!err('title')}
              />
              {err('title') && <p className="asm-error">{err('title')}</p>}
            </div>

            <div className="asm-row">
              <div className="asm-field">
                <Label className="asm-label" htmlFor="series-alt">Ten khac / Romaji</Label>
                <Input
                  id="series-alt"
                  className="asm-input"
                  value={form.altTitle}
                  onChange={e => patch({ altTitle: e.target.value })}
                  placeholder="Tuy chon"
                  maxLength={120}
                />
              </div>
              <div className="asm-field">
                <Label className="asm-label" htmlFor="series-tags">
                  Tag
                  {tagsLoading && <Loader2 className="ml-1 inline size-3 animate-spin text-muted-foreground" />}
                </Label>
                {apiTags.length > 0 ? (
                  <Select
                    value={form.tagInput ?? ''}
                    onValueChange={v => {
                      patch({ tagInput: v })
                      const current = form.tags
                      if (current.includes(v)) {
                        patch({ tags: current.filter(t => t !== v) })
                      } else {
                        patch({ tags: [...current, v].slice(0, 8) })
                      }
                    }}
                  >
                    <SelectTrigger id="series-tags" className="asm-input">
                      <SelectValue placeholder="Chọn tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      {apiTags.map(t => {
                        const name = t.tagName ?? t.TagName ?? t.name ?? t.Name ?? String(t)
                        const tagId = t.tagid ?? t.Tagid ?? t.id
                        const selKey = String(tagId ?? name)
                        return (
                          <SelectItem key={selKey} value={name}>
                            {name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="series-tags"
                    className="asm-input"
                    value={form.tags.join(', ')}
                    onChange={e => {
                      const tags = e.target.value.split(/[,;#]+/).map(t => t.trim()).filter(Boolean)
                      patch({ tags: tags.slice(0, 8) })
                    }}
                    placeholder="school-life, magic, adventure..."
                    maxLength={120}
                  />
                )}
                {form.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {form.tags.map(t => (
                      <button
                        key={t}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => patch({ tags: form.tags.filter(x => x !== t) })}
                      >
                        {t}
                        <span className="text-muted-foreground">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="asm-field">
              <Label className="asm-label" htmlFor="series-synopsis">
                Tom tat / gioi thieu <span className="asm-req">*</span>
              </Label>
              <Textarea
                id="series-synopsis"
                className="asm-textarea"
                value={form.synopsis}
                onChange={e => patch({ synopsis: e.target.value })}
                placeholder="Cot truyen, boi canh, nhan vat chinh..."
                rows={4}
                maxLength={2000}
                aria-invalid={!!err('synopsis')}
              />
              <div className="asm-char-count">
                <span className={form.synopsis.length < 1 ? 'asm-char-count--warn' : ''}>
                  {form.synopsis.length}/2000
                </span>
                {err('synopsis') && (
                  <span className="asm-error">{err('synopsis')}</span>
                )}
              </div>
            </div>

            {/* File uploads — bat buoc theo backend (proposalFile + coverImage) */}
            <div className="asm-row">
              <div className="asm-field">
                <Label className="asm-label" htmlFor="series-cover">
                  Anh bia <span className="asm-req">*</span>
                </Label>
                <Input
                  id="series-cover"
                  className="asm-input"
                  type="file"
                  accept="image/*"
                  onChange={e => patch({ coverImage: e.target.files?.[0] ?? null })}
                />
              </div>
              <div className="asm-field">
                <Label className="asm-label" htmlFor="series-proposal">
                  File ban de xuat (PDF) <span className="asm-req">*</span>
                </Label>
                <Input
                  id="series-proposal"
                  className="asm-input"
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => patch({ proposalFile: e.target.files?.[0] ?? null })}
                />
              </div>
            </div>
          </section>

          {/* ===== SECTION 2: Phan loai ===== */}
          <section className="asm-section">
            <div className="asm-section__head">
              <span className="asm-section__num">2</span>
              <h3 className="asm-section__title">Phan loai</h3>
            </div>

            {/* The loai */}
            <div className="asm-field">
              <Label className="asm-label">
                The loai <span className="asm-hint">(toi da 5)</span>
                {genresLoading && <Loader2 className="ml-1 inline size-3 animate-spin text-muted-foreground" />}
              </Label>
              <div className="asm-genres">
                {genresLoading ? (
                  <p className="text-xs text-muted-foreground py-2">Đang tải thể loại...</p>
                ) : apiGenres.length > 0 ? (
                  apiGenres.map(g => {
                    const name = g.genreName ?? g.GenreName ?? g.name ?? g.Name ?? String(g)
                    const active = form.genres.includes(name)
                    return (
                      <button
                        key={g.genreid ?? g.Genreid ?? g.id ?? name}
                        type="button"
                        onClick={() => toggleGenre(name)}
                        aria-pressed={active}
                        className={cn('asm-genre-chip', active && 'asm-genre-chip--on')}
                      >
                        {active && <Check className="size-3" />}
                        {name}
                      </button>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-2">Không tải được thể loại từ server.</p>
                )}
              </div>
              {err('genres') && <p className="asm-error">{err('genres')}</p>}
            </div>

            {/* Phan loai noi dung */}
            <div className="asm-field">
              <Label className="asm-label">Phan loai noi dung</Label>
              <Select value={form.contentRating} onValueChange={v => patch({ contentRating: v })}>
                <SelectTrigger className="asm-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERIES_CONTENT_RATINGS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="asm-footer">
              {touched && !validation.ok ? (
                <p className="asm-footer__warn">Vui long kiem tra cac truong con thieu</p>
              ) : null}
          <Button type="button" variant="outline" onClick={handleClose} className="asm-btn-cancel">
            Huy
          </Button>
          <Button
            type="submit"
            form="series-form"
            className="asm-btn-submit"
          >
            {isEdit ? 'Luu thay doi' : 'Tao series'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
