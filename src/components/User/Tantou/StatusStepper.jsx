import { Check } from 'lucide-react'
import {
  SERIES_FLOW_STEPS,
  currentStepIndex,
  isRevisionStatus,
} from '@/pages/User/Tantou/TantouEditor.helpers.js'

export function StatusStepper({ status }) {
  const activeIdx = currentStepIndex(status)
  const revision = isRevisionStatus(status)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SERIES_FLOW_STEPS.map((step, i) => {
        const done = activeIdx > i || activeIdx === SERIES_FLOW_STEPS.length
        const active = i === activeIdx
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                done
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : active
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {done ? <Check className="size-3" /> : null}
              {step.label}
            </div>
            {i < SERIES_FLOW_STEPS.length - 1 && (
              <div className={`h-px w-4 ${done ? 'bg-emerald-300' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
      {revision && (
        <span className="ml-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
          Revision Requested
        </span>
      )}
    </div>
  )
}