/** Loại việc giao cho Assistant trên từng vùng trang. */

export const NOTE_TASK_TYPES = [
  { value: 'background', label: 'Vẽ nền' },
  { value: 'dialog',    label: 'Hội thoại' },
  { value: 'ink',       label: 'Tô đường nét' },
  { value: 'shading',   label: 'Tô bóng' },
  { value: 'fx',        label: 'Hiệu ứng' },
  { value: 'content',   label: 'Nội dung khác' },
]

export function noteTaskLabel(value) {
  return NOTE_TASK_TYPES.find(t => t.value === value)?.label ?? 'Khác'
}

/**
 * Map FE note.taskType → enum BE PageIssueDto.Create.
 * - IssueType (BE): Revision | Production
 * - WorkCategory (BE): Content | Dialog | Inking | Effects | Shading | Background
 * Phải đồng bộ với [AllowedValues] trong DTOs/PageIssueDto.cs.
 */
export const NOTE_TASK_TYPE_TO_BE = Object.freeze({
  background: { IssueType: 'Production', WorkCategory: 'Background' },
  dialog:     { IssueType: 'Production', WorkCategory: 'Dialog' },
  ink:        { IssueType: 'Production', WorkCategory: 'Inking' },
  fx:         { IssueType: 'Production', WorkCategory: 'Effects' },
  shading:    { IssueType: 'Production', WorkCategory: 'Shading' },
  content:    { IssueType: 'Production', WorkCategory: 'Content' },
  // Fallback khi FE không nhận diện được (vd: legacy value) — giữ đúng enum
  unknown:    { IssueType: 'Revision',   WorkCategory: 'Content' },
})

/**
 * Lấy BE IssueType/WorkCategory tương ứng với note.taskType.
 * Luôn trả về giá trị hợp lệ (fallback 'unknown').
 */
export function getNoteTaskBeMapping(taskType) {
  return NOTE_TASK_TYPE_TO_BE[taskType] ?? NOTE_TASK_TYPE_TO_BE.unknown
}
