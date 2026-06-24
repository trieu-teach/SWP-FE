import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Inbox,
  Layers as LayersIcon,
  Lightbulb,
  Pencil,
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  TrendingUp,
  Upload,
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
import { usePageLayers } from '@/hooks/usePageLayers.js'
import { useCollaborationRequests } from '@/hooks/useCollaborationRequests.js'
import { pageIssuesService } from '@/api/api.js'
import { LAYER_ACCENT_COLORS } from '@/constants/assistantPaintPalette.js'
import { NOTE_TASK_LABELS } from '@/constants/assistantWorkspaceTasks.js'
import '@/styles/mangaPage.css'
import {
  pushAssistantDeliverable,
} from '@/utils/assistantWorkspaceStorage.js'
import CollaborationRequestsDialog from '@/components/CollaborationRequestsDialog.jsx'

const NAV_LINKS = [{ to: '/', label: 'Trang chu' }]

const STATS = [
  { label: 'Chapter nhan', icon: Inbox, color: 'sky' },
  { label: 'Dang xu ly', icon: LayersIcon, color: 'violet' },
  { label: 'Cho duyet', icon: Clock, color: 'amber' },
  { label: 'Da duyet', icon: CheckCircle2, color: 'emerald' },
  { label: 'Thu nhap thang', icon: TrendingUp, color: 'rose' },
]

const STAT_ICON_BG = {
  sky: 'bg-sky-500/10 text-sky-600',
  violet: 'bg-violet-500/10 text-violet-600',
  amber: 'bg-amber-500/10 text-amber-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  rose: 'bg-rose-500/10 text-rose-600',
}

const STATUS_BADGE = {
  pending: { label: 'Cho nhan', className: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'Dang xu ly', className: 'bg-violet-100 text-violet-700' },
  submitted: { label: 'Da gui', className: 'bg-emerald-100 text-emerald-700' },
  approved: { label: 'Da duyet', className: 'bg-green-100 text-green-700' },
}

function uid(prefix = 'layer') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function LayerStack({ baseUrl, notes, baseVisible, notesVisible, paintLayers, className }) {
  return (
    <div
      className={cn(
        'manga-page manga-page--canvas relative mx-auto overflow-hidden rounded-lg border-2 border-dashed border-white/10 shadow-2xl',
        className,
      )}
    >
      {baseVisible && baseUrl ? (
        <img src={baseUrl} alt="" className="manga-page__media absolute inset-0 size-full" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 text-xs text-zinc-500">
          {baseUrl ? 'Anh goc dang an' : 'Chua co anh goc'}
        </div>
      )}
      {paintLayers.map(layer =>
        layer.visible && layer.dataUrl ? (
          <img
            key={layer.id}
            src={layer.dataUrl}
            alt={layer.name}
            className="manga-page__media pointer-events-none absolute inset-0 size-full"
            style={{ opacity: Math.max(0, Math.min(1, (layer.opacity ?? 100) / 100)) }}
          />
        ) : null
      )}
      {notesVisible && notes?.length ? (
        <div className="pointer-events-none absolute inset-0">
          {notes.map((n, idx) => (
            <div
              key={n.clientKey ?? n.pageissueid ?? n.Pageissueid ?? n.issueid ?? n.Issueid ?? idx}
              className="absolute rounded-md border-2 border-dashed border-rose-500/90 bg-rose-500/10"
              style={{
                left: `${n.boxx ?? n.boxX ?? n.BoxX ?? 0}%`,
                top: `${n.boxy ?? n.boxY ?? n.BoxY ?? 0}%`,
                width: `${n.boxwidth ?? n.boxWidth ?? n.BoxWidth ?? 10}%`,
                height: `${n.boxheight ?? n.boxHeight ?? n.BoxHeight ?? 10}%`,
              }}
            >
              <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-sm bg-rose-500 text-[10px] font-bold text-white shadow">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LayerRow({ layer, accent, onToggle, onChangeOpacity, onRemove, onPickFile }) {
  return (
    <li
      className={cn(
        'group relative rounded-lg border p-3 transition-colors',
        layer.visible ? 'border-border bg-card' : 'border-dashed border-muted bg-muted/40',
      )}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-center gap-3">
        <Button
          size="icon-sm"
          variant={layer.visible ? 'default' : 'outline'}
          onClick={() => onToggle(layer.id)}
          aria-label={layer.visible ? 'An layer' : 'Hien layer'}
        >
          {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>
        <div className="size-10 shrink-0 overflow-hidden rounded border bg-muted">
          {layer.dataUrl ? (
            <img src={layer.dataUrl} alt="" className="size-full object-contain" />
          ) : (
            <span className="flex size-full items-center justify-center text-base">🎨</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium">{layer.name}</span>
          <p className="text-[10px] text-muted-foreground">Layer Assistant tai len</p>
        </div>
        <div className="flex items-center gap-1">
          {onPickFile ? (
            <Button size="icon-sm" variant="ghost" onClick={() => onPickFile(layer.id)} title="Thay file">
              <Upload className="size-3.5" />
            </Button>
          ) : null}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onRemove(layer.id)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Xoa layer"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {layer.visible ? (
        <div className="mt-2 flex items-center gap-2 pl-11">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Dam</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={layer.opacity ?? 100}
            onChange={(e) => onChangeOpacity(layer.id, Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
            {layer.opacity ?? 100}%
          </span>
        </div>
      ) : null}
    </li>
  )
}

export default function Assistant() {
  const navigate = useNavigate()
  const session = getSession()
  const user = session ?? {}

  const { assignments, loading: assignmentsLoading } = useAssistantAssignments()
  const [collabOpen, setCollabOpen] = useState(false)
  const { pendingCount } = useCollaborationRequests()
  const [selectedChapterId, setSelectedChapterId] = useState(null)
  const [baseVisible, setBaseVisible] = useState(true)
  const [notesVisible, setNotesVisible] = useState(true)
  const [paintLayers, setPaintLayers] = useState([])
  const [busy, setBusy] = useState(false)
  const [layerToReplace, setLayerToReplace] = useState(null)
  const [pageNotes, setPageNotes] = useState([])

  const selectedAssignment = useMemo(
    () => assignments.find(a => a.chapterId === selectedChapterId) ?? null,
    [assignments, selectedChapterId],
  )

  const safePageIdx = 0
  const safePage = selectedAssignment?.pages?.[safePageIdx] ?? null

  const layersApi = usePageLayers(safePage?.id ?? null)
  const { layers: remoteLayers, loading: remoteLoading, uploading, refresh: refreshLayers, addLayer } = layersApi

  useEffect(() => {
    if (!safePage?.id) { setPageNotes([]); return }
    pageIssuesService.getAll(selectedAssignment?.chapterId).then(res => {
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setPageNotes(list)
    }).catch(() => setPageNotes([]))
  }, [safePage?.id, selectedAssignment?.chapterId])

  useEffect(() => {
    setPaintLayers(prev => {
      if (prev.length === remoteLayers.length && prev.every((l, i) => l.id === remoteLayers[i]?.id)) return prev
      return remoteLayers.map(l => ({
        id: l.id,
        name: l.name,
        dataUrl: l.imageUrl,
        thumbUrl: l.imageUrl,
        visible: l.visible ?? true,
        opacity: l.opacity ?? 100,
        type: 'paint',
      }))
    })
  }, [remoteLayers])

  useEffect(() => {
    if (!assignments.length) {
      setSelectedChapterId(null)
      return
    }
    if (!assignments.some(a => a.chapterId === selectedChapterId)) {
      setSelectedChapterId(assignments[0]?.chapterId ?? null)
    }
  }, [assignments.length, selectedChapterId])

  const visibleLayerCount = paintLayers.filter(l => l.visible && l.dataUrl).length

  const statsDisplayed = useMemo(() => {
    const progress = assignments.filter(a => a.status === 'in_progress').length
    const review = assignments.filter(a => a.status === 'submitted').length
    const approved = assignments.filter(a => a.status === 'approved').length
    return [
      { ...STATS[0], value: String(assignments.length || 0) },
      { ...STATS[1], value: String(progress || (selectedAssignment ? 1 : 0)) },
      { ...STATS[2], value: String(review) },
      { ...STATS[3], value: String(approved) },
      { ...STATS[4], value: '—' },
    ]
  }, [assignments, selectedAssignment])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleSelectChapter(chapter) {
    setSelectedChapterId(chapter.chapterId)
    setPaintLayers([])
    setNotesVisible(true)
    setBaseVisible(true)
  }

  function toggleLayerVisible(layerId) {
    setPaintLayers(prev => prev.map(l => (l.id === layerId ? { ...l, visible: !l.visible } : l)))
  }

  function changeLayerOpacity(layerId, value) {
    setPaintLayers(prev => prev.map(l => (l.id === layerId ? { ...l, opacity: value } : l)))
  }

  function renameLayer(layerId, name) {
    setPaintLayers(prev => prev.map(l => (l.id === layerId ? { ...l, name } : l)))
  }

  function removeLayer(layerId) {
    const layer = paintLayers.find(l => l.id === layerId)
    if (!layer) return
    if (!window.confirm(`Xoa layer "${layer.name}"? Thao tac nay khong hoan tac.`)) return
    setPaintLayers(prev => prev.filter(l => l.id !== layerId))
  }

  async function handleAddLayerFiles(files, replaceLayerId = null) {
    if (!safePage || !files?.length) return
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) {
      toast.error('Chi chap nhan file anh (PNG/JPG/WebP).')
      return
    }
    setBusy(true)
    try {
      const filesToRead = replaceLayerId ? arr.slice(0, 1) : arr
      const dataUrls = await Promise.all(filesToRead.map(fileToDataUrl))

      // Push to backend API
      const createdLayers = []
      for (let i = 0; i < filesToRead.length; i++) {
        const file = filesToRead[i]
        const idx = replaceLayerId ? -1 : paintLayers.length + i
        try {
          const ui = await layersApi.addLayer({ file, index: idx, uploaderId: user?.id ?? null })
          if (ui) createdLayers.push(ui)
        } catch {
          // API failed — still add locally so user doesn't lose work
        }
      }

      setPaintLayers(prev => {
        if (replaceLayerId) {
          // Replace: keep remote layer id if available, else update dataUrl
          const remoteLayer = createdLayers[0]
          return prev.map(l =>
            l.id === replaceLayerId
              ? {
                  ...l,
                  dataUrl: dataUrls[0],
                  thumbUrl: dataUrls[0],
                  visible: true,
                  id: remoteLayer?.id ?? l.id,
                }
              : l
          )
        }
        // Add new: merge remote layers with local ones
        const localNew = dataUrls.map((url, i) => ({
          id: uid('paint'),
          name: `Layer ${prev.length + i + 1}`,
          dataUrl: url,
          thumbUrl: url,
          type: 'paint',
          visible: true,
          opacity: 100,
        }))
        const remoteNew = createdLayers.map((ui, i) => ({
          id: ui.id,
          name: ui.name,
          dataUrl: ui.imageUrl || dataUrls[remoteNew ? i : 0],
          thumbUrl: ui.imageUrl || dataUrls[remoteNew ? i : 0],
          type: 'paint',
          visible: true,
          opacity: 100,
        }))
        return [...prev, ...remoteNew, ...localNew.filter(l => !remoteNew.some(r => r.dataUrl === l.dataUrl))]
      })
      toast.success(replaceLayerId ? 'Da thay file cho layer.' : `Da them ${filesToRead.length} layer moi.`)
    } catch {
      toast.error('Khong doc duoc anh.')
    } finally {
      setBusy(false)
      setLayerToReplace(null)
    }
  }

  function onFileInputChange(e) {
    const files = e.target.files
    void handleAddLayerFiles(files, layerToReplace)
    e.target.value = ''
  }

  function pickReplaceFile(layerId) {
    setLayerToReplace(layerId)
    document.getElementById('as-layer-file-input')?.click()
  }

  function handleDownloadOriginal() {
    if (!safePage?.url) return
    const a = document.createElement('a')
    a.href = safePage.url
    a.download = `${selectedAssignment?.seriesTitle}-Ch${selectedAssignment?.chapterNum}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Da tai anh goc ve may.')
  }

async function compositeLayers(layers) {
  if (!layers?.length) return null
  return new Promise((resolve) => {
    const imgs = []
    let loaded = 0
    layers.forEach((l, i) => {
      const img = new Image()
      img.onload = () => {
        imgs[i] = img
        loaded++
        if (loaded === layers.length) {
          const canvas = document.createElement('canvas')
          canvas.width = imgs[0].naturalWidth || imgs[0].width || 800
          canvas.height = imgs[0].naturalHeight || imgs[0].height || 1200
          const ctx = canvas.getContext('2d')
          imgs.forEach(img => ctx.drawImage(img, 0, 0))
          resolve(canvas.toDataURL('image/png'))
        }
      }
      img.onerror = () => {
        imgs[i] = null
        loaded++
        if (loaded === layers.length) resolve(null)
      }
      img.src = l.dataUrl
    })
  })
}

async function handleSubmitToMangaka() {
    if (!selectedAssignment) return
    const visibleCount = paintLayers.filter(l => l.visible && l.dataUrl).length
    if (visibleCount === 0) {
      toast.error('Hay bat it nhat mot layer co anh truoc khi gui.')
      return
    }

    const visibleLayers = paintLayers.filter(l => l.visible && l.dataUrl)
    const hasOverlay = visibleLayers.length === 1
    const hasComposite = visibleLayers.length > 1

    const deliverable = {
      id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      seriesTitle: selectedAssignment.seriesTitle,
      chapterId: selectedAssignment.chapterId,
      chapterNum: selectedAssignment.chapterNum,
      pageIndex: safePageIdx,
      pageLabel: `Ch.${selectedAssignment.chapterNum} — Trang ${safePageIdx + 1}`,
      submissionId: null,
      sendMode: hasOverlay ? 'overlay' : 'composite',
      // overlay: 1 layer = gửi layer trong suốt + ảnh gốc
      overlayDataUrl: hasOverlay ? visibleLayers[0].dataUrl : null,
      // composite: nhiều layer = gửi ảnh đã ghép
      compositeDataUrl: hasComposite ? await compositeLayers(visibleLayers) : null,
      mangakaImageUrl: safePage?.url ?? null,
      assistantName: user?.fullname ?? user?.name ?? 'Assistant',
      createdAt: new Date().toISOString(),
    }

    await pushAssistantDeliverable(deliverable)
    window.dispatchEvent(new Event('mk-assistant-storage'))
    toast.success('Da gui cho Mangaka.')
  }

  const noteCount = pageNotes.length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        links={NAV_LINKS}
        onLogout={user ? handleLogout : undefined}
        onNotificationClick={() => setCollabOpen(true)}
        notificationCount={pendingCount}
      />

      <WorkspaceHero
        className="from-violet-950 to-zinc-950"
        label="Assistant Workspace"
        title={`Xin chao${user?.fullname ? `, ${user.fullname.split(' ')[0]}` : ''}`}
        description="Tai anh goc ve ve tren phan mem yeu thich, sau do upload tung layer PNG trong suot len day. Bat/tat tung layer de xem cach chung chong len nhau."
      >
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-300">
          <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
            <LayersIcon className="size-3" />
            Quan ly layer
          </Badge>
          <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
            <ArrowDownToLine className="size-3" />
            Tai anh goc
          </Badge>
          <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
            <Upload className="size-3" />
            Upload PNG trong suot
          </Badge>
        </div>
      </WorkspaceHero>

      <main className="page-container flex-1 py-8">
        <input
          id="as-layer-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={onFileInputChange}
        />

        {/* Stats row */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statsDisplayed.map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn('flex size-10 items-center justify-center rounded-xl', STAT_ICON_BG[s.color])}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold leading-tight">{s.value}</div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 3-column layout: Left | Center | Right */}
        <div className="grid gap-6 xl:grid-cols-[300px_1fr_360px]">

          {/* LEFT: Chapter list */}
          <Card className="flex flex-col gap-0 overflow-hidden p-0">
            <CardHeader className="border-b p-4">
              <CardTitle className="text-base">Chapter duoc giao</CardTitle>
              <CardDescription>Chon chapter de xu ly</CardDescription>
            </CardHeader>
            {assignmentsLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Dang tai...</div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Chua co chapter nao duoc gan.
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-220px)]">
                <ul className="divide-y">
                  {assignments.map((a, idx) => {
                    const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending
                    const cover = a.pages?.find(p => p.url)
                    const isSelected = a.chapterId === selectedChapterId
                    // Use composite key to avoid collisions: server chapterId vs localStorage submission
                    const assignmentKey = a.id ?? a.contractId ?? `${a.chapterId}-${a.seriesTitle}-${idx}`
                    return (
                      <li key={assignmentKey}>
                        <button
                          type="button"
                          onClick={() => handleSelectChapter(a)}
                          className={cn(
                            'flex w-full items-start gap-3 p-3 text-left transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                          )}
                        >
                          <span className="manga-page manga-page--thumb-md shrink-0 overflow-hidden rounded">
                            {cover?.url ? (
                              <img src={cover.url} alt="" className="manga-page__media" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">📄</span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="truncate text-sm font-semibold">{a.seriesTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              Ch.{a.chapterNum}{a.title ? ` · ${a.title}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{a.pageCount ?? a.pages?.length ?? 0} trang</p>
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
          </Card>

          {/* CENTER: Canvas + Notes */}
          <div className="space-y-4">
            {selectedAssignment ? (
              <>
                <Card className="overflow-hidden p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {selectedAssignment.seriesTitle} · Ch.{selectedAssignment.chapterNum}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Trang {safePageIdx + 1} / {selectedAssignment.pages?.length ?? 0}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant={baseVisible ? 'default' : 'outline'} onClick={() => setBaseVisible(v => !v)}>
                        {baseVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        Anh goc
                      </Button>
                      <Button
                        size="sm"
                        variant={notesVisible ? 'default' : 'outline'}
                        onClick={() => setNotesVisible(v => !v)}
                        disabled={noteCount === 0}
                      >
                        {notesVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        Ghi chu ({noteCount})
                      </Button>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-4">
                    <LayerStack
                      baseUrl={safePage?.url}
                      notes={pageNotes}
                      baseVisible={baseVisible}
                      notesVisible={notesVisible}
                      paintLayers={paintLayers}
                      className="w-full max-w-[640px]"
                    />
                    <p className="mt-3 text-center text-xs text-zinc-400">
                      Hien thi <strong className="text-white">{visibleLayerCount}</strong> / {paintLayers.length} layer
                      {baseVisible ? ' + anh goc' : ''}
                      {notesVisible && noteCount > 0 ? ' + ghi chu' : ''}
                    </p>
                  </div>
                </Card>

                {pageNotes.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <StickyNote className="size-4 text-rose-500" />
                        Vung viec Mangaka da danh dau
                      </CardTitle>
                      <CardDescription>
                        Tai anh goc, ve nhung phan nay tren phan mem yeu thich roi upload PNG trong suot len day.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {pageNotes.map((n, i) => (
                          <li key={n.clientKey ?? n.pageissueid ?? n.Pageissueid ?? i} className="flex items-start gap-2 rounded-md border p-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <Badge variant="outline" className="text-[10px]">
                                {NOTE_TASK_LABELS[n.issuetype] ?? n.issuetype ?? 'Khac'}
                              </Badge>
                              <p className="text-xs">{n.description ?? 'Khong co mo ta'}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <ImageIcon className="size-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Chon mot chapter o danh sach ben trai de bat dau.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Layer panel + Actions */}
          <aside className="space-y-4">
            <Card className="border-violet-200 bg-gradient-to-b from-violet-50 to-transparent dark:border-violet-500/20 dark:from-violet-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-violet-600" />
                  Cach hoat dong cua Layer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>Bat <strong className="text-foreground">Layer 1</strong> → chi thay ban ve cua layer 1.</p>
                <p>Bat them <strong className="text-foreground">Layer 2</strong> → ca 2 layer chong len nhau.</p>
                <p>Tat 1 layer → an ban ve do nhung van giu file.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayersIcon className="size-4 text-primary" />
                  Layer ({paintLayers.length})
                </CardTitle>
                <Button
                  size="sm"
                  disabled={!selectedAssignment || busy}
                  onClick={() => {
                    setLayerToReplace(null)
                    document.getElementById('as-layer-file-input')?.click()
                  }}
                >
                  <Plus className="size-3.5" />
                  Tai len
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedAssignment ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Chon mot chapter de bat dau quan ly layer.
                  </p>
                ) : (
                  <>
                    {safePage?.url ? (
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-lg border p-2.5',
                          baseVisible ? 'bg-card' : 'border-dashed bg-muted/40',
                        )}
                        style={{ borderLeftColor: '#71717a', borderLeftWidth: 3 }}
                      >
                        <Button
                          size="icon-sm"
                          variant={baseVisible ? 'default' : 'outline'}
                          onClick={() => setBaseVisible(v => !v)}
                        >
                          {baseVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        </Button>
                        <div className="size-9 shrink-0 overflow-hidden rounded border bg-muted">
                          {safePage.url ? (
                            <img src={safePage.url} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center">🖼️</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">Anh goc Mangaka</p>
                          <p className="text-[10px] text-muted-foreground">Khong the chinh sua</p>
                        </div>
                      </div>
                    ) : null}

                    {paintLayers.length > 0 ? (
                      <ul className="space-y-2">
                        {[...paintLayers].reverse().map((layer, i) => (
                          <LayerRow
                            key={layer.id}
                            layer={layer}
                            accent={LAYER_ACCENT_COLORS[(paintLayers.length - 1 - i) % LAYER_ACCENT_COLORS.length]}
                            onToggle={toggleLayerVisible}
                            onChangeOpacity={changeLayerOpacity}
                            onRemove={removeLayer}
                            onPickFile={pickReplaceFile}
                          />
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-center">
                        <Pencil className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">
                          Chua co layer. Bam <strong>Tai len</strong> de them.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hanh dong</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!safePage?.url}
                  onClick={handleDownloadOriginal}
                >
                  <ArrowDownToLine className="size-4" />
                  Tai anh goc ve may
                </Button>
                <Button
                  className="w-full"
                  disabled={!selectedAssignment || busy || visibleLayerCount === 0}
                  onClick={handleSubmitToMangaka}
                >
                  <Send className="size-4" />
                  Gui cho Mangaka
                </Button>
                {visibleLayerCount === 0 && selectedAssignment ? (
                  <p className="text-[10px] text-amber-600">
                    Bat it nhat 1 layer (co anh) truoc khi gui.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4 text-primary" />
                  Quy trinh goi y
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-2.5 border-l border-muted pl-5">
                  {[
                    { step: 1, text: 'Tai anh goc ve may' },
                    { step: 2, text: 'Mo Photoshop / Krita / Procreate, ve tren layer trong suot' },
                    { step: 3, text: 'Xuat tung layer ra PNG (giu nen trong suot)' },
                    { step: 4, text: 'Upload tung PNG o day — bat/tat de xem hieu ung' },
                    { step: 5, text: 'Gui cho Mangaka duyet' },
                  ].map(it => (
                    <li key={it.step} className="relative">
                      <span className="absolute -left-[26px] flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                        {it.step}
                      </span>
                      <p className="text-xs text-muted-foreground">{it.text}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-emerald-600" />
                  Thong ke thu nhap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <div>
                    <p className="text-sm font-medium">Thang nay</p>
                    <p className="text-xs text-muted-foreground">Chapter da duyet</p>
                  </div>
                  <span className="font-bold tabular-nums text-emerald-600">—</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <div>
                    <p className="text-sm font-medium">Tong thu nhap</p>
                    <p className="text-xs text-muted-foreground">Thang nay</p>
                  </div>
                  <span className="font-bold tabular-nums text-emerald-600">—</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />

      <CollaborationRequestsDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
      />
    </div>
  )
}
