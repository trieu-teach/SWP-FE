// src/lib/currentUser.js
// Lấy id của user đang đăng nhập, ưu tiên session lưu sau login (sessionStorage),
// fallback decode JWT từ localStorage nếu sessionStorage không có hoặc thiếu field.

export function getCurrentUserId() {
  try {
    const raw = sessionStorage.getItem('auth_user')
    if (raw) {
      const session = JSON.parse(raw)
      const id = session?.user?.id ?? session?.user?.user_id ?? session?.id ?? session?.userId
      if (id != null) return id
    }
  } catch { /* ignore */ }

  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!base64) return null
    const padded = base64 + '=='.slice((base64.length + 4) % 4)
    const payload = JSON.parse(atob(padded))
    const id = payload?.sub ?? payload?.nameid ?? payload?.userId ?? payload?.user_id
    return id != null ? id : null
  } catch {
    return null
  }
}

/**
 * So sánh id của user đang xem với id user đang đăng nhập.
 * So sánh dạng chuỗi để tránh lệch kiểu number/string giữa JWT và dữ liệu API.
 */
export function isCurrentUser(userId) {
  const currentId = getCurrentUserId()
  if (currentId == null || userId == null) return false
  return String(currentId) === String(userId)
}