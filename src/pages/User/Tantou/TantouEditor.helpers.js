import { LABEL_EDITOR_BOARD } from '@/constants/roleTerminology.js'
import { DEBUT_STATUSES, APPROVED_STATUSES, EB_STATUSES } from '@/constants/tantou.js'

// ─── Status helpers ─────────────────────────────────────────────────────────
export function normalizeStatus(raw) {
  return (raw ?? '').toLowerCase().replace(/[_\s-]/g, '')
}

export function isDebutStatus(raw)    { return DEBUT_STATUSES.has(normalizeStatus(raw)) }
export function isApprovedStatus(raw) { return APPROVED_STATUSES.has(normalizeStatus(raw)) }
export function isEbStatus(raw)       { return EB_STATUSES.has(normalizeStatus(raw)) }

export function statusVariant(raw) {
  const s = normalizeStatus(raw)
  if (s === 'draft')                             return 'outline'
  if (s === 'submitted' || s === 'editorreview') return 'secondary'
  if (s === 'ebreview'  || s === 'underreview')  return 'default'
  if (s === 'publishing' || s === 'approved')    return 'default'
  if (s === 'rejected'  || s === 'cancelled')    return 'destructive'
  if (s === 'inproduction')                      return 'secondary'
  if (s === 'ready')                             return 'default'
  if (s === 'published')                         return 'outline'
  if (s === 'delayed')                           return 'destructive'
  if (s === 'revision' || s === 'revisionrequested') return 'destructive'
  return 'outline'
}

export function statusLabel(raw) {
  const map = {
    draft:        'Bản nháp',
    submitted:    'Chờ duyệt',
    editorreview: 'Tantou đang xét',
    ebreview:     `Đang xét ${LABEL_EDITOR_BOARD}`,
    underreview:  `Đang xét ${LABEL_EDITOR_BOARD}`,
    publishing:   'Đang phát hành',
    approved:     'Đã duyệt',
    completed:    'Hoàn thành',
    rejected:     'Đã từ chối',
    cancelled:    'Đã huỷ',
    inproduction: 'Đang thực hiện',
    ready:        'Sẵn sàng — chờ EB',
    published:    'Đã phát hành',
    delayed:      'Trễ deadline',
    revision:           'Yêu cầu chỉnh sửa',
    revisionrequested:  'Yêu cầu chỉnh sửa',
  }
  return map[normalizeStatus(raw)] ?? raw
}

// ─── Format helpers ──────────────────────────────────────────────────────────
export function cadenceFromFormat(raw) {
  const f = normalizeStatus(raw)
  if (f === 'weekly')  return 'weekly'
  if (f === 'monthly') return 'monthly'
  return null
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────
export function handleCoverImgError(e) {
  e.currentTarget.style.display = 'none'
  e.currentTarget.nextElementSibling?.classList.remove('hidden')
}

// ─── Status flow (stepper) ───────────────────────────────────────────────────
export const SERIES_FLOW_STEPS = [
  { key: 'submitted',    label: 'Pending' },
  { key: 'editorreview', label: 'In Review' },
  { key: 'ebreview',     label: 'Ready for EB' },
]

// 'revision' không nằm trong flow tuyến tính — là nhánh rẽ tạm thời, hiển thị
// như một badge phụ bên cạnh stepper thay vì 1 step cố định.
export function isRevisionStatus(raw) {
  const s = normalizeStatus(raw)
  return s === 'revision' || s === 'revisionrequested'
}

export function currentStepIndex(raw) {
  const s = normalizeStatus(raw)
  const idx = SERIES_FLOW_STEPS.findIndex(step => step.key === s)
  if (idx !== -1) return idx
  // draft chưa vào flow; published/approved coi như đã xong toàn bộ flow
  if (s === 'draft') return -1
  if (s === 'approved' || s === 'publishing' || s === 'completed') return SERIES_FLOW_STEPS.length
  return -1
}

// ─── Deadline helper (Dashboard) ──────────────────────────────────────────────
export function isDelayedDeadline(deadline, status) {
  if (!deadline) return false
  const s = normalizeStatus(status)
  if (s === 'delayed') return true
  if (s === 'published' || s === 'cancelled') return false
  return new Date(deadline).getTime() < Date.now()
}

// ─── Progress checklist (GIẢ ĐỊNH TẠM — derive từ status) ─────────────────────
// CHƯA có field BE riêng cho từng bước sản xuất. Khi BE bổ sung field thật
// (vd: chapter.productionSteps: { script, sketch, ink, review, final }),
// thay nội dung 2 hàm dưới đây để đọc trực tiếp field đó thay vì suy luận.
const PROGRESS_STEPS = ['Script', 'Sketch', 'Ink', 'Review', 'Final']

const STATUS_TO_STEP_COUNT = {
  draft: 0,
  inproduction: 2,
  delayed: 2,
  ready: 4,
  published: 5,
}

export function progressStepsForStatus(raw) {
  const s = normalizeStatus(raw)
  const doneCount = STATUS_TO_STEP_COUNT[s] ?? 0
  return PROGRESS_STEPS.map((label, i) => ({ label, done: i < doneCount }))
}

export function progressPercentForStatus(raw) {
  const steps = progressStepsForStatus(raw)
  const done = steps.filter(s => s.done).length
  return Math.round((done / steps.length) * 100)
}