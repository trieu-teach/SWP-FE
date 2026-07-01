import {
  progressStepsForStatus,
  progressPercentForStatus,
} from '@/pages/User/Tantou/TantouEditor.helpers.js'

export function ProgressTracker({ status, chapterLabel, variant = 'bar' }) {
  const percent = progressPercentForStatus(status)
  const steps = progressStepsForStatus(status)

  if (variant === 'checklist') {
    return (
      <div className="space-y-1.5">
        {chapterLabel && <p className="text-sm font-medium">{chapterLabel}</p>}
        <ul className="space-y-1">
          {steps.map(s => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span className={s.done ? 'text-emerald-600' : 'text-muted-foreground'}>
                {s.done ? '✓' : '□'}
              </span>
              <span className={s.done ? '' : 'text-muted-foreground'}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {chapterLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{chapterLabel}</span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}