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