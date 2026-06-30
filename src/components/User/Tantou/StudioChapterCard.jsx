import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LABEL_EDITOR_BOARD } from '@/constants/roleTerminology.js'
import { normalizeStatus, statusVariant, statusLabel } from '@/pages/User/Tantou/TantouEditor.helpers.js'
import { CoverThumb } from './CoverThumb.jsx'

// Chỉ xem — Tantou không duyệt chapter, quyền đó thuộc EB
export function StudioChapterCard({ item }) {
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